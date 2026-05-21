FROM nginx:alpine
COPY nginx.conf /etc/nginx/templates/default.conf.template
# nginx entrypoint processes templates with envsubst before starting
EXPOSE 80 443
