# perspectives-rabbitmq-service
A simple service that proxies for a local RabbitMQ server. It should be behind a solid HTTP server such as Apache.

The Perspectives Distributed Runtime (PDR) is written such that it assumes that this service is available on the endpoint `/rbsr`. Apache must be configured to pass any request to this endpoint to the local service that can be spun up using the program given in this module. Here is a suitable Apache conf section:

```
    <Location "/rbsr>
      ProxyPass http://localhost:5988
    </Location>
```

It listens on the port configured with runtime parameter `--port` (in this example taken to be 5988).

It interacts with the RabbitMQ server listening on host `--rabbithost` (default: `localhost`) and port `--rabbitport`.

It uses a RabbitMQ account with management priviliges to access the management api (https://rawcdn.githack.com/rabbitmq/rabbitmq-management/v3.8.7/priv/www/api/index.html and see https://www.rabbitmq.com/management.html). The credentials for this account should be passed in with parameters `--admin` and `--adminpassword`

To access the server, create a POST request and send a payload consisting of this object:

```
{ userName, password, queueName }
```

The userName - password combination will be granted user status of the RabbitMQ server, provided the total number of registered users is not above a threshold configured in the file `maxusers.json`. Moreover, that user will be given exactly the required rights to be able to register the queue and a binding key to it.

The first time that the end user tries to access RabbitMQ with his credentials and tries to register listening to the queue, that queue will be created and the userName is used as binding key for this queue. Consequently, messages sent to `topic/<userName>` will end up in `queueName`.

This allows the service user to create a queue whose identity only it is in the know, while it can invite peers to use `userName` to sent him messages.

## Starting the server
The server must be started on the same host that runs the RabbitMQ service.

An example of starting the service manually can be found in the shell script `startservice.sh`.

## Developing
For https://mycontexts.com, the three source files can be copied to `/home/joop/rbsr` with the package script `publish`.