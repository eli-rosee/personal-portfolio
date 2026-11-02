---
title: "EVT Technology Challenge"
number: 4
status: in-orbit
summary: A secure web server in Docker that starts with one command, built for EVT's technical interview.
stack: [Docker, Nginx, Bash, OpenSSL]

display:
  image: project_image.png

highlights:
  - setup.mp4
  - success_page.mp4
screen: success_page.mp4

repo: https://github.com/eli-rosee/evt-technology-challenge

readouts:
  - label: Technical Interview
    value: Take-Home Challenge
  - label: Team
    value: Solo
  - label: When
    value: Apr 2026

media:
  - type: link
    file: EVT_Technology_Challenge_2026.pdf
    title: Challenge Prompt

draft: false

achievement: In just under two weeks, I went from brand new to these tools to a one-command secure server.
statement: I had *12 days* to build a secure server that starts with one command.
---

## The prompt

The prompt was to create a web server that hosts a page over a secure port, and can deploy in a single command.

I was interviewing with EVT (Enterprise Vision Technologies), which creates and sells IT infrastructure for enterprises. This challenge was a microcosm of their world, and pushed me into backend tools I'd never used.

A large part of the project was explaining the reasoning behind the tooling I chose. Because of this, the first major part of this project was research into the current standard in the world of backend web development.

## Approach

After hours of research, I chose Nginx inside a Docker container, initiated and supported by Bash scripts.

With this setup, **the only thing you need installed is Docker**. A virtual machine would have been much heavier to set up and run, and containers are the much more standard way to host a server. Kubernetes is needed when running multiple containers, which was overkill for the scope of this project.

Nginx is the lightest, fastest choice for serving a static page, and its configuration is far simpler than Apache's. I first got HTTPS working with Nginx installed straight on my machine, then moved it into **the official nginx image** from Docker Hub, which comes with Nginx ready to run.

With Docker handling every dependency, what was left was to automate it. I did so with **four Bash scripts**. The one to set up and deploy the server was required, but the other three I made to experiment. For the last three, I made one to test the server, one for Nginx logs, and one to shut the server down.

Initially, I wanted to register for a real certificate from a CA; however, this proved too complicated. That requires a registered domain, and it would have slowed down every run and fully broken the one-command deployment rule. **A self-signed certificate for localhost** worked well for this project, and made much more sense given the scope.

The prompt only asked for a secure port, but I also added a **redirect from HTTP to HTTPS** in the Nginx config file. That way, all insecure connections would simply be transformed into a secure connection.

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
2. **Make the certificate:** A self-signed key and certificate for localhost, which can be reused on later runs.
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

doom.mp4 was a callback to the joke that you can run Doom on anything, even my web server (though it wasn't technically running on the server).

![](success_page.mp4 "The success page, served over HTTPS")

test.sh then checks **the redirect, the page, and the TLS handshake** with curl.

![](setup.mp4 "setup.sh, then test.sh")

## Where I went wrong

The one step I couldn't automate was Docker permissions.

Joining the docker group takes sudo and a fresh login, which **a script shouldn't do on its own**. setup.sh checks for access first, and the README explains how to fix it.

Two things I'd change if I could go back:

1. **The key is in the image.** Anyone with the image has it. Mounting it at runtime or using a secrets manager keeps it out.
2. **The last test fails.** As the clip shows, curl rejects the certificate because it's self-signed rather than issued by a trusted certificate authority. `--cacert` would verify it instead.

## What I took from it

It came down to me and one other candidate, and they got the offer.

However, I am still really glad I got to undertake this project. In under two weeks, I went from brand new to these tools to **a one-command secure server**, with reasoning behind every choice. I learned a lot and expanded my backend toolkit substantially.
