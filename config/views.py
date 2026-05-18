from django.conf import settings
from django.http import FileResponse, Http404
from django.views import View


class ReactAppView(View):
    def get(self, request, *args, **kwargs):
        index_path = settings.FRONTEND_DIST_DIR / 'index.html'
        if not index_path.exists():
            raise Http404('React build not found. Run npm run build first.')
        return FileResponse(index_path.open('rb'), content_type='text/html')
