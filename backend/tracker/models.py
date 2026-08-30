from django.db import models


class Folder(models.Model):
    SOURCE_DISCOGS_IMPORT = "discogs_import"
    SOURCE_USER_CREATED = "user_created"
    SOURCE_CHOICES = [
        (SOURCE_DISCOGS_IMPORT, "Discogs Import"),
        (SOURCE_USER_CREATED, "User Created"),
    ]

    name = models.CharField(max_length=255, unique=True)
    source = models.CharField(max_length=20, choices=SOURCE_CHOICES)

    def __str__(self):
        return self.name
