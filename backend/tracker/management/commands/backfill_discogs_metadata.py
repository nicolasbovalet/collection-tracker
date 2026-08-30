from django.core.management.base import BaseCommand

from tracker.discogs import DiscogsClient
from tracker.models import Release


class Command(BaseCommand):
    help = (
        "Backfill country, genre, estimated_value, and num_for_sale for "
        "existing collection releases, via the Discogs API."
    )

    def handle(self, *args, **options):
        client = DiscogsClient()
        queryset = Release.objects.filter(status=Release.STATUS_COLLECTION)
        total = queryset.count()
        self.stdout.write(f"Backfilling Discogs metadata for {total} release(s)...")
        updated = 0
        failed = 0
        for index, release in enumerate(queryset, start=1):
            try:
                details = client.get_release_details(release.discogs_release_id)
                release.country = details.get("country", "") or release.country
                release.genre = details.get("genre", "") or release.genre
                estimated_value = details.get("estimated_value")
                if estimated_value is not None:
                    release.estimated_value = estimated_value
                num_for_sale = details.get("num_for_sale")
                if num_for_sale is not None:
                    release.num_for_sale = num_for_sale
                release.save(
                    update_fields=["country", "genre", "estimated_value", "num_for_sale"]
                )
                updated += 1
            except Exception as exc:
                failed += 1
                self.stdout.write(f"  [{index}/{total}] failed for release {release.id}: {exc}")
                continue
        self.stdout.write(
            self.style.SUCCESS(f"Done. Updated {updated}, failed {failed}, of {total}.")
        )
