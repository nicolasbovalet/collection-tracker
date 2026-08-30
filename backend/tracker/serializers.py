from rest_framework import serializers
from django.utils import timezone

from .models import Folder, Release


class FolderSerializer(serializers.ModelSerializer):
    class Meta:
        model = Folder
        fields = ["id", "name", "source"]
        read_only_fields = ["source"]


class ReleaseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Release
        fields = [
            "id", "discogs_release_id", "catalog_number", "artist", "title",
            "label", "format", "personal_rating", "released_year", "status",
            "folder", "date_added", "media_condition", "sleeve_condition",
            "notes", "cover_art_url",
        ]


class AddToWishlistSerializer(serializers.Serializer):
    discogs_release_id = serializers.IntegerField()
    artist = serializers.CharField(allow_blank=True, default="")
    title = serializers.CharField(allow_blank=True, default="")
    format = serializers.CharField(allow_blank=True, default="")
    released_year = serializers.IntegerField(required=False, allow_null=True)
    cover_art_url = serializers.CharField(allow_blank=True, default="")

    def create(self, validated_data):
        return Release.objects.create(
            status=Release.STATUS_WISHLIST,
            date_added=timezone.now(),
            **validated_data,
        )


class AddToCollectionSerializer(serializers.Serializer):
    discogs_release_id = serializers.IntegerField()
    artist = serializers.CharField(allow_blank=True, default="")
    title = serializers.CharField(allow_blank=True, default="")
    format = serializers.CharField(allow_blank=True, default="")
    released_year = serializers.IntegerField(required=False, allow_null=True)
    cover_art_url = serializers.CharField(allow_blank=True, default="")
    folder = serializers.PrimaryKeyRelatedField(queryset=Folder.objects.all())
    media_condition = serializers.ChoiceField(
        choices=Release.CONDITION_CHOICES, required=False, allow_null=True
    )
    sleeve_condition = serializers.ChoiceField(
        choices=Release.CONDITION_CHOICES, required=False, allow_null=True
    )
    notes = serializers.CharField(allow_blank=True, default="")

    def create(self, validated_data):
        return Release.objects.create(
            status=Release.STATUS_COLLECTION,
            date_added=timezone.now(),
            **validated_data,
        )
