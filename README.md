# Deno :

Please don't use npm to install packages.
It doesn't work like that...

## Install Deno :
```bash
curl -fsSL https://deno.land/install.sh | sh
```

## Run server (Dev env) :
```bash

# Similar to 'npm start dev'
deno task dev

# If doesnt work, try
deno install
```

## Build :
```bash
deno task build && cd dist \
&& deno add jsr:@std/http \
&& deno run --allow-net --allow-read --allow-sys jsr:@std/http/file-server
```