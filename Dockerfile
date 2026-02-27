FROM docker.io/denoland/deno:2.1.2

EXPOSE 4173

WORKDIR /app

COPY . .
RUN rm -rf deno.lock

RUN deno install
RUN deno task build

CMD ["deno", "task", "preview"]
