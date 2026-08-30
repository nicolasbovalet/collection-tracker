from rest_framework import status
from rest_framework.test import APITestCase

from tracker.models import Folder


class FolderApiTests(APITestCase):
    def test_list_folders_ordered_by_name(self):
        Folder.objects.create(name="Rock", source=Folder.SOURCE_USER_CREATED)
        Folder.objects.create(name="Jazz", source=Folder.SOURCE_USER_CREATED)

        response = self.client.get("/api/folders/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        names = [item["name"] for item in response.data]
        self.assertEqual(names, ["Jazz", "Rock"])

    def test_create_folder_forces_user_created_source(self):
        response = self.client.post(
            "/api/folders/",
            {"name": "Ambient", "source": Folder.SOURCE_DISCOGS_IMPORT},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        folder = Folder.objects.get(name="Ambient")
        self.assertEqual(folder.source, Folder.SOURCE_USER_CREATED)
