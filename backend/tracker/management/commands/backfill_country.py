from django.core.management.base import BaseCommand

from tracker.discogs import DiscogsClient
from tracker.models import Release


class Command(BaseCommand):
    help = "Backfill the country field for existing collection releases missing it, via the Discogs API."

    def handle(self, *args, **options):
        client = DiscogsClient()
        queryset = Release.objects.filter(status=Release.STATUS_COLLECTION, country="")
        total = queryset.count()
        self.stdout.write(f"Backfilling country for {total} release(s)...")
        updated = 0
        failed = 0
        for index, release in enumerate(queryset, start=1):
            try:
                details = client.get_release_details(release.discogs_release_id)
                country = details.get("country", "")
                if country:
                    release.country = country
                    release.save(update_fields=["country"])
                    updated += 1
            except Exception as exc:
                failed += 1
                self.stdout.write(f"  [{index}/{total}] failed for release {release.id}: {exc}")
                continue
        self.stdout.write(self.style.SUCCESS(f"Done. Updated {updated}, failed {failed}, of {total}."))
