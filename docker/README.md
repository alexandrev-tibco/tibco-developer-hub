## Start database only

Run `docker compose` to create/start the database

```
docker compose up -d
```

## Build and start the TIBCO Hub image and create/start the database

To start the database and also build and start the TIBCO Hub container, run the following:

```
docker compose -f docker-compose.yml -f docker-compose.dev-image.yml up -d
```

_Note_ Docker will reuse any existing TIBCO Hub Docker image. If you made any changes to the project code or Dockerfile, you might want to rebuild the docker image to apply those changes.
To rebuild the image run the following:

```
docker compose -f docker-compose.yml -f docker-compose.dev-image.yml up -d --build
```

### Stopping TIBCO Hub only

If you want to stop the TIBCO Hub container only but keep the database running. Run:

```
docker compose -f docker-compose.yml -f docker-compose.dev-image.yml stop tibco-hub
```

### Running a pre-built image from reldocker

Run:

```
HUB_DOCKER_IMAGE=<your full image tag> docker compose -f docker-compose.yml -f docker-compose.dev-image.yml up --no-build -d
```

For example:

```
HUB_DOCKER_IMAGE=reldocker.tibco.com/pdx/tibco-hub:5-setup-automation docker compose -f docker-compose.yml -f docker-compose.dev-image.yml up --no-build -d

```
