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

Finally, set a maximum number of user accounts permitted with parameter `--maxusers`.

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
pm2 start selfregister.js -- --port=5988 --rabbithost=localhost --rabbitport=15672 --admin=ADMIN --adminpassword=PASSWORD --maxusers=100
```

## Developing
For https://mycontexts.com, the three source files can be copied to `/home/joop/rbsr` with the package script `publish`.

There is a test in the npm package. To test from the command line, use this:

```
curl -X POST https://mycontexts.com/rbsr -k -d '{"userName":"aap","password":"noot","queueName":"mies"}'
```