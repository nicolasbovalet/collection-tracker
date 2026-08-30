from django.db import IntegrityError
from django.test import TestCase

from tracker.models import Folder


class FolderModelTests(TestCase):
    def test_create_folder(self):
        folder = Folder.objects.create(name="Jazz", source=Folder.SOURCE_USER_CREATED)
        self.assertEqual(str(folder), "Jazz")

    def test_folder_name_is_unique(self):
        Folder.objects.create(name="Jazz", source=Folder.SOURCE_USER_CREATED)
        with self.assertRaises(IntegrityError):
            Folder.objects.create(name="Jazz", source=Folder.SOURCE_DISCOGS_IMPORT)
