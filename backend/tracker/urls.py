from django.urls import path

from . import views

urlpatterns = [
    path("health/", views.health, name="health"),
    path("folders/", views.FolderListCreateView.as_view(), name="folder-list-create"),
]
