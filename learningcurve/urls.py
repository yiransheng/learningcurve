from learningcurve import view

urlpatterns = (

    # API handler
    (r'/api/(\w+)', view.ApiHandler),

    (r'.*', view.AppHandler),
)
