from django.db import IntegrityError
from django.test import TestCase
from django.utils import timezone

from tracker.models import Folder, Release


class FolderModelTests(TestCase):
    def test_create_folder(self):
        folder = Folder.objects.create(name="Jazz", source=Folder.SOURCE_USER_CREATED)
        self.assertEqual(str(folder), "Jazz")

    def test_folder_name_is_unique(self):
        Folder.objects.create(name="Jazz", source=Folder.SOURCE_USER_CREATED)
        with self.assertRaises(IntegrityError):
            Folder.objects.create(name="Jazz", source=Folder.SOURCE_DISCOGS_IMPORT)


class ReleaseModelTests(TestCase):
    def test_create_release_minimal(self):
        release = Release.objects.create(
            discogs_release_id=123456,
            artist="Radiohead",
            title="OK Computer",
            status=Release.STATUS_WISHLIST,
            date_added=timezone.now(),
        )
        self.assertIsNone(release.folder)
        self.assertIsNone(release.media_condition)
        self.assertEqual(release.country, "")

    def test_create_release_with_country(self):
        release = Release.objects.create(
            discogs_release_id=123456,
            artist="Radiohead",
            title="OK Computer",
            status=Release.STATUS_WISHLIST,
            date_added=timezone.now(),
            country="UK",
        )
        self.assertEqual(release.country, "UK")

    def test_release_str(self):
        release = Release.objects.create(
            discogs_release_id=1,
            artist="Boards of Canada",
            title="Music Has the Right to Children",
            status=Release.STATUS_COLLECTION,
            date_added=timezone.now(),
        )
        self.assertEqual(
            str(release), "Boards of Canada - Music Has the Right to Children"
        )
