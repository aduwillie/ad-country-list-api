const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const queryString = require('querystring');
const winston = require('winston');
const { start } = require('repl');

const port = process.env.PORT || 3000;
const logger = winston.createLogger({
  transports: [
    new winston.transports.Console(),
  ],
});

const computeTimeDifferenceInMs = (startTime) => {
  const computedMs = new Date().getTime() - startTime.getTime();
  return `${computedMs}ms`;
};

const getList = (httpResponse, fields = [], { startTime, requestPath }) => {
  const listFilePath = path.resolve(__dirname, 'list.json');
  if (fields.length === 0) {
    const readStream = fs.createReadStream(listFilePath);

    return readStream
      .on('open', () => readStream.pipe(httpResponse))
      .on('end', () =>
        logger.info(`${requestPath} Request completed at ${computeTimeDifferenceInMs(startTime)}`)
      )
      .on('error', (streamError) => httpResponse.end(streamError));
  }

  const listContents = fs.readFileSync(listFilePath);
  const formattedList = JSON.parse(listContents)
    .map((countryEntry) => {
      const obj = {};
      fields.forEach(field => obj[field] = countryEntry[field]);
      return obj;
    });
  httpResponse.statusCode = 200;
  httpResponse.statusMessage = 'Success';
  httpResponse.end(JSON.stringify(formattedList));
  logger.info(`${requestPath} Request completed at ${computeTimeDifferenceInMs(startTime)}`);
};

const handleStream = (httpResponse, listFilePath, startTime) => {
  const readStream = fs.createReadStream(listFilePath);
  readStream
    .on('open', () => readStream.pipe(httpResponse))
    .on('error', (streamError) => httpResponse.end(streamError));
};

const server = http.createServer((req, res) => {
  const startTime = new Date();
  const parsedUrl = url.parse(req.url);

  if (parsedUrl.pathname === '/') {
    getList(
      res,
      parsedUrl
      && parsedUrl.query
      && queryString.parse(parsedUrl.query).onlyCode
      && ['name', 'callingCodes']
      || [],
      {
        startTime,
        requestPath: parsedUrl.path,
      },
    );
  } else {
    res.statusCode = 400;
    res.statusMessage = 'Bad request';
    res.end();
  }
});

server.listen(port, (data) => {
  logger.info(`Server listening on port: ${port}`);
});
