from decimal import Decimal

from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import generics
from rest_framework import status as drf_status
from rest_framework.views import APIView
from django.db.models import Case, When, CharField, Sum
from django.db.models.functions import Lower, Substr
from django.http import HttpResponse
from django.shortcuts import get_object_or_404

from .models import Folder, Release
from .serializers import FolderSerializer, ReleaseSerializer, AddToWishlistSerializer, AddToCollectionSerializer
from .serializers import MoveToCollectionSerializer
from .discogs import DiscogsClient
from .csv_import import extract_new_folder_names, parse_csv_rows, commit_import
from .csv_export import build_export_rows, render_csv


@api_view(["GET"])
def health(request):
    return Response({"status": "ok"})


class FolderListCreateView(generics.ListCreateAPIView):
    queryset = Folder.objects.all().order_by("name")
    serializer_class = FolderSerializer

    def perform_create(self, serializer):
        serializer.save(source=Folder.SOURCE_USER_CREATED)


class ReleaseListView(generics.ListAPIView):
    serializer_class = ReleaseSerializer

    def get_queryset(self):
        queryset = Release.objects.all()
        params = self.request.query_params

        status_param = params.get("status")
        if status_param:
            queryset = queryset.filter(status=status_param)

        folder_param = params.get("folder")
        if folder_param:
            queryset = queryset.filter(folder_id=folder_param)

        format_param = params.get("format")
        if format_param:
            queryset = queryset.filter(format__icontains=format_param)

        artist_param = params.get("artist")
        if artist_param:
            queryset = queryset.filter(artist__icontains=artist_param)

        # "condition" filters media_condition — the condition most relevant
        # to grid filtering. sleeve_condition has no separate filter in v1.
        condition_param = params.get("condition")
        if condition_param:
            queryset = queryset.filter(media_condition=condition_param)

        rating_param = params.get("rating")
        if rating_param and rating_param.isdigit():
            queryset = queryset.filter(personal_rating=int(rating_param))

        year_param = params.get("year")
        if year_param and year_param.isdigit():
            queryset = queryset.filter(released_year=int(year_param))

        ordering = params.get("ordering")
        if ordering:
            descending = ordering.startswith("-")
            field = ordering[1:] if descending else ordering

            if field == "artist":
                queryset = queryset.annotate(
                    sort_key=Lower(
                        Case(
                            When(artist__istartswith="The ", then=Substr("artist", 5)),
                            default="artist",
                            output_field=CharField(),
                        )
                    )
                )
                queryset = queryset.order_by("-sort_key" if descending else "sort_key")
            elif field == "title":
                queryset = queryset.annotate(sort_key=Lower("title"))
                queryset = queryset.order_by("-sort_key" if descending else "sort_key")
            else:
                queryset = queryset.order_by(ordering)

        return queryset


class DiscogsSearchView(APIView):
    def get(self, request):
        query = request.query_params.get("q", "").strip()
        if not query:
            return Response(
                {"detail": "Query parameter 'q' is required."},
                status=drf_status.HTTP_400_BAD_REQUEST,
            )
        client = DiscogsClient()
        results = client.search(query)
        return Response({"results": results})


class CsvImportDryRunView(APIView):
    def post(self, request):
        uploaded_file = request.FILES.get("file")
        if not uploaded_file:
            return Response(
                {"detail": "A CSV file is required."},
                status=drf_status.HTTP_400_BAD_REQUEST,
            )
        rows = parse_csv_rows(uploaded_file)
        existing_names = Folder.objects.values_list("name", flat=True)
        new_folders = extract_new_folder_names(rows, existing_names)
        return Response({"new_folders": new_folders})


class CsvImportCommitView(APIView):
    def post(self, request):
        uploaded_file = request.FILES.get("file")
        folder_mode = request.data.get("folder_mode", "per_folder")
        if not uploaded_file:
            return Response(
                {"detail": "A CSV file is required."},
                status=drf_status.HTTP_400_BAD_REQUEST,
            )
        if folder_mode not in ("per_folder", "main_only"):
            return Response(
                {"detail": "folder_mode must be 'per_folder' or 'main_only'."},
                status=drf_status.HTTP_400_BAD_REQUEST,
            )
        rows = parse_csv_rows(uploaded_file)
        client = DiscogsClient()
        summary = commit_import(rows, folder_mode, client.get_release_details)
        return Response(summary, status=drf_status.HTTP_201_CREATED)


class AddToWishlistView(APIView):
    def post(self, request):
        serializer = AddToWishlistSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        release = serializer.save()
        return Response(ReleaseSerializer(release).data, status=drf_status.HTTP_201_CREATED)


class AddToCollectionView(APIView):
    def post(self, request):
        serializer = AddToCollectionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        release = serializer.save()
        return Response(ReleaseSerializer(release).data, status=drf_status.HTTP_201_CREATED)


class MoveToCollectionView(APIView):
    def post(self, request, pk):
        release = get_object_or_404(Release, pk=pk, status=Release.STATUS_WISHLIST)
        serializer = MoveToCollectionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        for field, value in serializer.validated_data.items():
            setattr(release, field, value)
        release.status = Release.STATUS_COLLECTION
        release.save()
        return Response(ReleaseSerializer(release).data)


class ExportCsvView(APIView):
    def get(self, request):
        queryset = Release.objects.filter(status=Release.STATUS_COLLECTION).select_related("folder")
        rows = build_export_rows(queryset)
        csv_text = render_csv(rows)
        response = HttpResponse(csv_text, content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="collection-export.csv"'
        return response


class StatsView(APIView):
    def get(self, request):
        collection_qs = Release.objects.filter(status=Release.STATUS_COLLECTION)

        collection_count = collection_qs.count()
        wishlist_count = Release.objects.filter(status=Release.STATUS_WISHLIST).count()

        total_value = collection_qs.aggregate(total=Sum("estimated_value"))["total"]

        format_distribution = {}
        for format_value in collection_qs.exclude(format="").values_list("format", flat=True):
            bucket = format_value.split(",")[0].strip() or "Unknown"
            format_distribution[bucket] = format_distribution.get(bucket, 0) + 1

        condition_distribution = {}
        for condition_value in collection_qs.values_list("media_condition", flat=True):
            bucket = condition_value or "Not graded"
            condition_distribution[bucket] = condition_distribution.get(bucket, 0) + 1

        genre_distribution = {}
        for genre_value in collection_qs.values_list("genre", flat=True):
            if not genre_value:
                genre_distribution["Unknown"] = genre_distribution.get("Unknown", 0) + 1
                continue
            for genre in genre_value.split(","):
                genre = genre.strip()
                if genre:
                    genre_distribution[genre] = genre_distribution.get(genre, 0) + 1

        cumulative_series = []
        running_total = Decimal("0")
        valued_releases = collection_qs.exclude(estimated_value=None).order_by("date_added")
        for release in valued_releases:
            running_total += release.estimated_value
            cumulative_series.append({
                "date_added": release.date_added.date().isoformat(),
                "cumulative_value": str(running_total),
            })

        recent_additions = ReleaseSerializer(
            collection_qs.order_by("-date_added")[:8], many=True
        ).data

        return Response({
            "collection_count": collection_count,
            "wishlist_count": wishlist_count,
            "total_estimated_value": str(total_value) if total_value is not None else None,
            "format_distribution": format_distribution,
            "condition_distribution": condition_distribution,
            "genre_distribution": genre_distribution,
            "cumulative_value_by_date_added": cumulative_series,
            "recent_additions": recent_additions,
        })
