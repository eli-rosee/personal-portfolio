---
# project
#   status:
#     liftoff
#     in-orbit
#     decommissioned

title: "EVT Technology Challenge"
number: 4
status: in-orbit
summary: A secure web server in Docker that starts with one command, built for EVT's technical interview.
stack: [Docker, Nginx, Bash, OpenSSL]

# display (delete for no signal)
#   fit:
#     crop (default)
#     whole
#   crop:
#     center (default)
#     top
#     bottom
#     left
#     right
#     top left
#     top right
#     bottom left
#     bottom right
#     x% y%
#   effects:
#     true (default)
#     false
#   zoom: 1 and up

display:
  image: project_image.png

# code (one or neither)
#   repo: <url> (default)
#   private: <tooltip>

repo: https://github.com/eli-rosee/evt-technology-challenge

# readouts (up to 4)
#   note

readouts:
  - label: Technical Interview
    value: Take-Home Challenge
  - label: Team
    value: Solo
  - label: When
    value: Apr 2026

# media (in order)
#   type:
#     video
#       thumbnail
#       sound:
#         true (default)
#         false
#     clip
#       file:
#         .mp4
#         .webm
#         .gif
#       shape:
#         landscape (default)
#         portrait
#     image
#       shape:
#         landscape (default)
#         portrait
#       fit, crop, zoom: as in display
#     slides
#       npm run slides <slug> deck.pptx makes the folder and the PDF
#       folder
#       pdf
#     link
#       href or file
#       live:
#         false (default)
#         true
#       label
#   every card
#     caption
#     wide:
#       false (default)
#       true
#   image, clip, video, slides
#     effects:
#       false (default)
#       true

media:
  - type: link
    file: EVT_Technology_Challenge_2026.pdf
    title: Challenge Prompt

# draft
#   delete to publish

draft: false

# write-up (files go in assets/)
#   ## Heading
#   **bold**
#   [text](url "tooltip")
#   - list
#   1. steps in order (numbered 01, 02, …)
#   - **Label:** text (the gap after the colon is set by the site)
#   blank line = new paragraph; extra blank lines or spaces add nothing
#   &ensp; or &emsp; = a one-off wider space
#   line\ (line break)
#   ![alt](file "caption") on its own line
#     2–3 in a row sit side by side
#     {effects=true} right after it adds the image effects
#     {values=N} right after a clip adds a count of N values and a progress bar
#   ```math … ``` = equations, one a line
#     Label:  x = F x    (note)
#     v_x  F^T  S^{-1}

# order
#   Background (opt)
#   The problem · The prompt
#   Approach · What we built
#   The core algorithm (opt)
#   My role (team projects)
#   Where I went wrong
#   Results
#   Awards (opt)

statement: I had *12 days* to build a secure server that starts with one command.
---

## The prompt

The prompt was to create a web server that hosts a page over a secure port, and can deploy in a single command.

EVT (Enterprise Vision Technologies) creates and sells IT infrastructure for enterprises, and this challenge was a microcosm of their world. Beyond a secure port and a single command, the only rule was that I had to write a README explaining how to run it and the design decisions behind it.

Everything else was up to me. The prompt (linked below) listed over a dozen tools, from Vagrant to Kubernetes to Ansible, and backend tooling was fairly new to me.

## Approach

After hours of research, I settled on Nginx inside a Docker container, started by Bash scripts.

With Docker, **the only thing you need installed is Docker**. A virtual machine would have been much heavier to set up and run, and containers are the much more common way to host a server. Kubernetes is needed when running multiple containers, which was overkill for a single server.

Nginx is the lightest, fastest choice for serving a static page, and its configuration is far simpler than Apache's. I first got HTTPS working with Nginx installed straight on my machine, then moved it into **the official nginx image** from Docker Hub, which comes with Nginx ready to run.

With Docker handling every dependency, what was left to automate fit in **four Bash scripts**. The one to set up and deploy the server was required, but the other three I made to stand out. One to test the server, one for nginx logs, and one to shut the server down.

Initially, I wanted to register for a real certificate from the CA; however, this proved too complicated. To do this, you need a registered domain, and it would have slowed down every run, and fully broken the one-command tenet. **A self-signed certificate for localhost** worked well for this project, and made much more sense given the scope.

The prompt only asked for a secure port, but I also added a **redirect from HTTP to HTTPS** in the nginx config file. That way, all insecure connections would simply be transformed into a secure connection.

```nginx file=configs/nginx.conf lines=35-55
# HTTP server block - configured to redirect all traffic to HTTPS
server {
    listen 80;
    server_name localhost;

    return 301 https://localhost;
}

# HTTPS server block - configured to encrypt communication using TLS
server {
    listen 443 ssl;
    server_name localhost;

    ssl_certificate /etc/nginx/certs/server.crt;
    ssl_certificate_key /etc/nginx/certs/server.key;

    location / {
        root /usr/share/nginx/html;
        index index.html;
    }
}
```

## How setup works

setup.sh goes from a fresh clone to a running server in four steps.

1. **Check Docker:** If Docker isn't reachable, it stops the build.
2. **Make the certificate:** A self-signed key and certificate for localhost which can be reused on later runs.
3. **Build:** The Dockerfile copies the page, config file, and certificate into the correct directories in nginx:stable.
4. **Run:** The container starts on ports 80 and 443.

```dockerfile file=Dockerfile
# Base image with nginx pre-installed (pulled from Docker Hub)
FROM nginx:stable

# Copy webpage and video to container
COPY resources/index.html resources/doom.mp4 /usr/share/nginx/html/

# Copy nginx config to container
COPY configs/nginx.conf /etc/nginx/nginx.conf

# Set up private key / cert pair in container
RUN mkdir /etc/nginx/certs
COPY certs/server.key /etc/nginx/certs/server.key
COPY certs/server.crt /etc/nginx/certs/server.crt

# Expose HTTP and HTTPS Ports in the container
EXPOSE 80 443

# Run nginx command upon container run
CMD ["nginx", "-g", "daemon off;"]
```

The doom.mp4 was a callback to the joke that you can run Doom on anything, even my webserver (even though it wasn't technically running on the server).

![](success_page.mp4 "The success page, served over HTTPS")

test.sh then checks **the redirect, the page and the TLS handshake** with curl.

![](setup.mp4 "setup.sh, then test.sh")

## Where I went wrong

The one step I couldn't automate was Docker permissions.

Joining the docker group takes sudo and a fresh login, which **a script shouldn't do on its own**. setup.sh checks for access first, and the README points out how to fix it.

Two things I'd change if I could go back:

1. **The key is in the image.** Anyone with the image has it. Mounting it at runtime or using a secrets manager keeps it out.
2. **The last test fails.** curl rejects the self-signed certificate, as the clip shows, as it is not in the certificate authority list, but self-signed. `--cacert` would verify it instead.

## What I took from it

It came down to me and one other candidate, and they got the offer.

However, I am still really glad I got to undertake this project. In under two weeks, I went from brand new to these tools to **a one-command secure server**, with a reason for every choice. Even today, I use the tools I learned in that interview to serve this site and my [capstone project](https://f1.elirose.dev "The live dashboard") from a mini PC at home.
