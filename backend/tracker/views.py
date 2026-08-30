from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import generics

from .models import Folder
from .serializers import FolderSerializer


@api_view(["GET"])
def health(request):
    return Response({"status": "ok"})


class FolderListCreateView(generics.ListCreateAPIView):
    queryset = Folder.objects.all().order_by("name")
    serializer_class = FolderSerializer

    def perform_create(self, serializer):
        serializer.save(source=Folder.SOURCE_USER_CREATED)
