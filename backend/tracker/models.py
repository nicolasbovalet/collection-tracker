from django.db import models
from django.core.validators import MaxValueValidator


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


class Release(models.Model):
    STATUS_WISHLIST = "wishlist"
    STATUS_COLLECTION = "collection"
    STATUS_CHOICES = [
        (STATUS_WISHLIST, "Wishlist"),
        (STATUS_COLLECTION, "Collection"),
    ]

    CONDITION_MINT = "Mint"
    CONDITION_NEAR_MINT = "Near Mint"
    CONDITION_VERY_GOOD_PLUS = "Very Good Plus"
    CONDITION_VERY_GOOD = "Very Good"
    CONDITION_GOOD_PLUS = "Good Plus"
    CONDITION_GOOD = "Good"
    CONDITION_FAIR = "Fair"
    CONDITION_POOR = "Poor"
    CONDITION_CHOICES = [
        (CONDITION_MINT, CONDITION_MINT),
        (CONDITION_NEAR_MINT, CONDITION_NEAR_MINT),
        (CONDITION_VERY_GOOD_PLUS, CONDITION_VERY_GOOD_PLUS),
        (CONDITION_VERY_GOOD, CONDITION_VERY_GOOD),
        (CONDITION_GOOD_PLUS, CONDITION_GOOD_PLUS),
        (CONDITION_GOOD, CONDITION_GOOD),
        (CONDITION_FAIR, CONDITION_FAIR),
        (CONDITION_POOR, CONDITION_POOR),
    ]

    discogs_release_id = models.PositiveIntegerField()
    catalog_number = models.CharField(max_length=100, blank=True, default="")
    artist = models.CharField(max_length=255)
    title = models.CharField(max_length=255)
    label = models.CharField(max_length=255, blank=True, default="")
    format = models.CharField(max_length=255, blank=True, default="")
    country = models.CharField(max_length=100, blank=True, default="")
    personal_rating = models.PositiveSmallIntegerField(
        null=True, blank=True, validators=[MaxValueValidator(5)]
    )
    released_year = models.PositiveIntegerField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES)
    folder = models.ForeignKey(
        Folder, null=True, blank=True, on_delete=models.SET_NULL, related_name="releases"
    )
    date_added = models.DateTimeField()
    media_condition = models.CharField(
        max_length=20, choices=CONDITION_CHOICES, null=True, blank=True
    )
    sleeve_condition = models.CharField(
        max_length=20, choices=CONDITION_CHOICES, null=True, blank=True
    )
    notes = models.TextField(blank=True, default="")
    cover_art_url = models.URLField(blank=True, default="")

    def __str__(self):
        return f"{self.artist} - {self.title}"
