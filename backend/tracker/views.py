from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import generics
from rest_framework import status as drf_status
from rest_framework.views import APIView

from .models import Folder, Release
from .serializers import FolderSerializer, ReleaseSerializer
from .discogs import DiscogsClient


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
