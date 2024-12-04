// BEGIN LICENSE
// Perspectives Distributed Runtime
// SPDX-FileCopyrightText: 2019 Joop Ringelberg (joopringelberg@perspect.it), Cor Baars
// SPDX-License-Identifier: GPL-3.0-or-later
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.
//
// Full text of this license can be found in the LICENSE directory in the projects root.

// END LICENSE

const args = require('yargs').argv;
const http = require("http");

var argv = require('yargs/yargs')(process.argv.slice(2)).parse();
const host = 'localhost';
const port = argv.port;
const rabbitHost = argv.rabbithost || 'localhost'
const rabbitPort = argv.rabbitport;
const admin = argv.admin;
const adminPassword = argv.adminpassword;
const maxUsers = argv.maxusers;
const nodesEndpoint = "api/nodes/";
const vhost = "mycontexts";
const usersEndpoint = "api/users/";
const permissionsEndpoint = "api/permissions/";
const queueEndpoint = `/api/queues/${vhost}/`;

const logger = require('./logger');


// This listener is applied to all requests at the /rbsr endpoint.
const requestListener = function (req, res) {

    // Collect the payload.
    const chunks = [];
    
    req.on('data', function (chunk) {
        chunks.push(chunk);
        })

    req.on('end', function() {
        const result = Buffer.concat(chunks).toString();
        let payload
        try 
        {
            
            payload = JSON.parse(result);
        } 
        catch (ex) 
        {
            res.writeHead(400);
            return res.end(`Bad JSON. Expected { userName, password, queueName }, got: ${payload}`);
        }

        if ( payload && payload.userName && payload.password && payload.queueName)
        {
            res.setHeader("Content-Type", "application/json");
            res.writeHead(200);
            // Now that we have the required data, proceed to create an account and set its permissions, but...
            checkNumberOfAccounts()
                // ... only when the set maximum has not been exceeded.
                .then( () =>
                    createAccount( payload.userName, payload.password )
                        .then( () => setPermissions( payload.userName, payload.queueName ))
                        .then( () => res.end( JSON.stringify({succeeded: true}) ))
                        .catch( e => res.end( JSON.stringify( {succeeded: false, error: e}))) )
        }
        else
        {
            res.writeHead(400);
            return res.end(`Missing elements. Expected { userName, password, queueName }, got userName=${userName}, password=${password}, queueName=${queueName}.`);
        }
    });
}

const server = http.createServer(requestListener);
server.listen(port, host, () => {
    logger.info(`Server is running on http://${host}:${port}`);
});

function checkNumberOfAccounts()
{
    return getCurrentNumberOfUsers().then( n => {
        return new Promise((resolve, reject) => 
        {
            if (n < maxUsers)
            {
                resolve( true );
            }
            else
            {
                reject( "Maximum number of users reached, no new accounts possible.");
            }})
    })
}

function getCurrentNumberOfUsers()
{
    return new Promise((resolve, reject) => {
        const options = {
            hostname: rabbitHost,
            port: rabbitPort,
            path: `/${usersEndpoint}`,
            method: 'GET',
            auth: `${admin}:${adminPassword}`,
            };

        const req = http.request(options, (res) => {
            const chunks = [];
            let users;
        
            res.on("data", (chunk) => {
                chunks.push(chunk);
            });
        
            res.on("end", () => {
                try {
                    users = JSON.parse( Buffer.concat(chunks).toString() );
                }
                catch (e){
                    reject( `Incorrect JSON returned from RabbitMQ: ${e}.` );
                }
                logger.info( `Currently, we have ${users.length} users.`)
                resolve( users.length );
            });
        });
        
        req.on("error", (error) => {
            logger.error( error.message ? error.message : error.toString());
            reject(error);
            });
        req.end();
    })
}

// Returns a string. Sets the permissions necessary for the user to create and access his queue
function setPermissions( userName, queueName )
{
    const data = JSON.stringify( 
        { configure: queueName
        , write: queueName + "|amq\\.topic"
        , read: queueName + "|amq\\.topic"
        } );
    return new Promise((resolve, reject) => {
        const options = {
            hostname: rabbitHost,
            port: rabbitPort,
            path: `/${permissionsEndpoint}${vhost}/${userName}`,
            method: 'PUT',
            auth: `${admin}:${adminPassword}`,
            headers: {
                'Content-Length': Buffer.byteLength(data),
                'Content-Type': 'application/json',
            }
          };

          const req = http.request(options, (res) => {
            const chunks = [];
        
            res.on("data", (chunk) => {
              chunks.push(chunk);
            });
        
            res.on("end", () => {
                resolve( Buffer.concat(chunks).toString() );
            });
          });
        
          req.on("error", (error) => {
            logger.error( error.message ? error.message : error.toString());
            reject(error);
          });
          req.write( data );
          req.end();
    })
}

// Returns a string.
function createAccount( userName, password )
{
    const data = JSON.stringify( {password, tags: ""} );
    return new Promise((resolve, reject) => {
        const options = {
            hostname: rabbitHost,
            port: rabbitPort,
            path: `/${usersEndpoint}${userName}`,
            method: 'PUT',
            auth: `${admin}:${adminPassword}`,
            headers: {
                'Content-Length': Buffer.byteLength(data),
                'Content-Type': 'application/json',
            }
          };

          const req = http.request(options, (res) => {
            const chunks = [];
        
            res.on("data", (chunk) => {
              chunks.push(chunk);
            });
        
            res.on("end", () => {
                resolve( Buffer.concat(chunks).toString() );
            });
          });
        
          req.on("error", (error) => {
            logger.error( error.message ? error.message : error.toString());
            reject(error);
          });
          req.write( data );
          req.end();
    })
}
