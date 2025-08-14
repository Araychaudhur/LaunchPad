FROM nginx:1.25-alpine
RUN apk add --no-cache bash gettext curl
WORKDIR /etc/nginx
COPY nginx.conf.template /etc/nginx/templates/nginx.conf.template
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
EXPOSE 8080
CMD ["/entrypoint.sh"]
