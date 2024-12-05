# perspectives-rabbitmq-service
A simple service that proxies a request for registration to a local RabbitMQ server. It should itself be a back-end service that a solid HTTP server such as Apache proxies to.

The Perspectives Distributed Runtime (PDR) is written such that it assumes that this service is available on the endpoint `/rbsr`. Apache must be configured to pass any request to this endpoint to the local service that can be spun up using the program given in this module. Here is a suitable Apache conf section:

```
    <Location "/rbsr/">
      # Enable CORS headers
      Header set Access-Control-Allow-Origin "https://mycontexts.com"
      Header set Access-Control-Allow-Methods "GET, POST, OPTIONS"
      Header set Access-Control-Allow-Headers "Content-Type"
      Header set Access-Control-Allow-Credentials "true"
      Header set Access-Control-Expose-Headers "Content-Type, Cache-Control, Accept-Ranges, ETag, Server"

      # Handle OPTIONS requests (preflight requests)
      SetEnvIf Request_Method OPTIONS OPTIONS_REQUEST
      Header always set Access-Control-Max-Age "3600" env=OPTIONS_REQUEST

      ProxyPass http://localhost:5988
    </Location>
```

It listens on the port configured with runtime parameter `--port` (in this example taken to be 5988).

It interacts with the RabbitMQ server listening on host `--rabbithost` (default: `localhost`) and port `--rabbitport`.

Set a maximum number of user accounts permitted with parameter `--maxusers`.

Finally, provide the logger level with optional parameter `--level` (default is 'info'). Levels can be:

* error: 0,
* warn: 1,
* info: 2,
* http: 3,
* verbose: 4,
* debug: 5,
* silly: 6

All logging statements with the provided level or lower will end up in the log files. There are two files: `error.log` and `combined.log`. Both are found in the directory from which the process starts.

It uses a RabbitMQ account with management priviliges to access the [management api](https://rawcdn.githack.com/rabbitmq/rabbitmq-management/v3.8.7/priv/www/api/index.html) (but also see [this page](https://www.rabbitmq.com/management.html)). The credentials for this account should be passed in with parameters `--admin` and `--adminpassword`

To access the server, create a POST request and send a payload consisting of this object:

```
{ userName, password, queueName }
```

The userName - password combination will be granted user status of the RabbitMQ server, provided the total number of registered users is not above the threshold configured with the parameter `maxusers`. Moreover, that user will be given exactly the required rights to be able to register the queue and a binding key to it.

The first time that the end user tries to access RabbitMQ with his credentials and tries to register listening to the queue, that queue will be created and the userName is used as binding key for this queue. Consequently, messages sent to `topic/<userName>` will end up in `queueName`.

This allows the service user to create a queue whose identity only it is in the know, while it can invite peers to use `userName` to sent him messages.

## Installing
Install using npm:

```
npm install git+https://github.com/joopringelberg/perspectives-rabbitmq-service.git
```

## Starting the server manually
The server must be started on the same host that runs the RabbitMQ service.

An example of starting the service manually can be found in the shell script `startservice.sh`.

## Making the service a deamon with pm2
To make sure that the service is restarted after system boot, install [pm2](https://www.npmjs.com/package/pm2) on the server. Then start this service through pm2 like this:

```
pm2 start selfregister.js -- --port=5988 --rabbithost=localhost --rabbitport=15672 --admin=ADMIN --adminpassword=PASSWORD --maxusers=100 --level=error
```
## Apache configuration
Even though the PDR consists of scripts in the domain https://mycontexts.com and the perspectives-rabbitmq-service is served from the same domain, because it is requested from within a Service Worker (actually, the SharedWorker running the PDR requests it, but all of its requests are sent through a Service Worker), the browser considers it to be a cross-domain request. For that reason, we need to have Apache send back CORS headers.

It turns out that (at least per december 5, 2024) _credentials in the url_ make Chrome (build 131.0.6778.86) reject the request (giving a minimally worded Cors reason). FireFox (130.0b9) lets it go through.

## Developing
For https://mycontexts.com, the three source files can be copied to `/home/joop/rbsr` with the package script `publish`.

There is a test in the npm package. To test from the command line, use this:

```
curl -X POST https://mycontexts.com/rbsr -k -d '{"userName":"aap","password":"noot","queueName":"mies"}'
```