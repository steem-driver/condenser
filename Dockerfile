FROM node:8.7

ARG SOURCE_COMMIT
ENV SOURCE_COMMIT ${SOURCE_COMMIT}
ARG DOCKER_TAG
ENV DOCKER_TAG ${DOCKER_TAG}
ENV SDC_CLIENT_STEEMD_URL https://anyx.io
ENV SDC_GOOGLE_ANALYTICS_ID UA-145303936-1
ENV SDC_IMAGE_PROXY_PREFIX https://steemitimages.com/
ENV SDC_SERVER_STEEMD_URL https://anyx.io
ENV SDC_UPLOAD_IMAGE_URL https://steemitimages.com
ENV WALLET_URL https://steemwallet.herokuapp.com
# yarn > npm
#RUN npm install --global yarn

RUN npm install -g yarn

WORKDIR /var/app
RUN mkdir -p /var/app
ADD package.json yarn.lock /var/app/
RUN yarn install --non-interactive --frozen-lockfile

COPY . /var/app

# FIXME TODO: fix eslint warnings

#RUN mkdir tmp && \
#  npm test && \
#  ./node_modules/.bin/eslint . && \
#  npm run build

RUN mkdir tmp && \
    yarn test && yarn build

ENV PORT 8080
ENV NODE_ENV production

EXPOSE 8080

CMD [ "yarn", "run", "production" ]

# uncomment the lines below to run it in development mode
# ENV NODE_ENV development
# CMD [ "yarn", "run", "start" ]
