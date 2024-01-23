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
const nodesEndpoint = "api/nodes/";
const vhost = "mycontexts";
const usersEndpoint = "api/users/";
const permissionsEndpoint = "api/permissions/";
const queueEndpoint = `/api/queues/${vhost}/`;

const requestListener = function (req, res) {
    res.setHeader("Content-Type", "application/json");
    res.writeHead(200);
    getNodes().then( nodes => res.end( nodes ))
    res.end("ok");
};

const server = http.createServer(requestListener);
server.listen(port, host, () => {
    console.log(`Server is running on http://${host}:${port}`);
});

// console.log( `These have been passed in: port=${port}, rabbitPort=${rabbitPort}, admin=${admin}, adminPassword=${adminPassword}.`);

function getNodes()
{
    return new Promise((resolve, reject) => {
        const options = {
            hostname: rabbitHost,
            port: rabbitPort,
            path: `/${nodesEndpoint}`,
            method: 'GET',
            auth: `${admin}:${adminPassword}`
          };
        const req = http.request(options, (res) => {
          const chunks = [];
      
          res.on("data", (chunk) => {
            chunks.push(chunk);
          });
      
          res.on("end", () => {
            resolve(JSON.parse( Buffer.concat(chunks) ).toString() );
          });
        });
      
        req.on("error", (error) => {
          reject(error);
        });
      
        req.end();
      });
}

