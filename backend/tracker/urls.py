from django.urls import path

from . import views

urlpatterns = [
    path("health/", views.health, name="health"),
    path("folders/", views.FolderListCreateView.as_view(), name="folder-list-create"),
    path("releases/", views.ReleaseListView.as_view(), name="release-list"),
    path("releases/<int:pk>/", views.ReleaseDetailView.as_view(), name="release-detail"),
    path("discogs/search/", views.DiscogsSearchView.as_view(), name="discogs-search"),
    path(
        "discogs/release/<int:release_id>/",
        views.DiscogsReleaseDetailView.as_view(),
        name="discogs-release-detail",
    ),
    path(
        "import/discogs-csv/dry-run/",
        views.CsvImportDryRunView.as_view(),
        name="csv-import-dry-run",
    ),
    path(
        "import/discogs-csv/commit/",
        views.CsvImportCommitView.as_view(),
        name="csv-import-commit",
    ),
    path("releases/wishlist/", views.AddToWishlistView.as_view(), name="release-add-wishlist"),
    path("releases/collection/", views.AddToCollectionView.as_view(), name="release-add-collection"),
    path(
        "releases/<int:pk>/move-to-collection/",
        views.MoveToCollectionView.as_view(),
        name="release-move-to-collection",
    ),
    path(
        "export/discogs-csv/",
        views.ExportCsvView.as_view(),
        name="export-discogs-csv",
    ),
    path("stats/", views.StatsView.as_view(), name="stats"),
]
