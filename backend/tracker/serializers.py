from rest_framework import serializers

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
