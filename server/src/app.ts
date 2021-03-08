import express from 'express';
import { httpGet, httpPost, initNetworking } from "./requestManager";
import { appConfig } from "./appConfig";
const app: express.Application = express();
const port: number = Number(process.env.PORT) || 3001;

const auth = {
  username: appConfig.AGORA_API_KEY,
  password: appConfig.AGORA_API_SECRET
}
/**
 * FROM DOCS https://docs.agora.io/en/cloud-recording/restfulapi/#/Cloud%20Recording/acquire
 * 
A string that contains the UID of the recording client, for example "527841". The UID needs to meet the following requirements:

    It is a 32-bit unsigned integer within the range between 1 and (232-1).
    It is unique and does not clash with any existing UID in the channel.
    Cloud Recording does not support string UID (User Account). Ensure that all UIDs in the channel are integers.
*/
const recordingClientId = "666"

const channelName = "channel-xyz"

initNetworking({
  servers: {
    main: {
      port: 443,
      protocol: "https",
      serverAddress: "api.agora.io",
      baseUrl: "/v1/"
    },
    "other-api": {
      port: 443,
      protocol: "https",
      serverAddress: "api.agora.io",
      baseUrl: "/v1/"
    },
  },
  loggingEnabled: true
})

type AcquireResult = {
  resourceId: string
};

let resourceId = "";
let sid = "";
app.post("/api/start-recording", async (req, res) => {

  try {
    const acquireResult = await httpPost<AcquireResult>({
      url: `apps/${appConfig.AGORA_APP_ID}/cloud_recording/acquire`,
      payload: {
        cname: channelName,
        uid: recordingClientId,
        clientRequest: {
          resourceExpiredHour: 24
        }
      },
      basicAuth: auth
    })

    const startRecordResult = await httpPost<{
      resourceId: string,
      sid: string
    }>({
      url: `/apps/${appConfig.AGORA_APP_ID}/cloud_recording/resourceid/${acquireResult.resourceId}/mode/mix/start`,
      basicAuth: auth,
      payload: {
        cname: channelName,
        uid: recordingClientId,//-1837211383
        clientRequest: {
          "recordingConfig": {
            "maxIdleTime": 30,
            "streamTypes": 2,
            "audioProfile": 1,
            "channelType": 0,
            "videoStreamType": 1,
            "transcodingConfig": {
              "height": 1280,
              "width": 720,
              "bitrate": 1710,
              "fps": 60,
              "mixedVideoLayout": 3,
              "layoutConfig": [
                {
                  x_axis: 0,
                  y_axis: 0,
                  width: 1,
                  height: 0.5,
                  render_mode: 0
                },
                {
                  x_axis: 0,
                  y_axis: 0.5,
                  width: 1,
                  height: 0.5,
                  render_mode: 0
                }
              ],
              "backgroundColor": "#FF0000"
            },
          },
          "storageConfig": {
            "accessKey": appConfig.AWS_ACCESS_KEY,
            "region": appConfig.AWS_REGION,
            "bucket": appConfig.AWS_BUCKET_URL,
            "secretKey": appConfig.AWS_SECRET_KEY,
            "vendor": 1,
            "fileNamePrefix": ["recordings"]
          }
        }
      }
    })
    resourceId = startRecordResult.resourceId;
    sid = startRecordResult.sid

    try {
      const recordStatus = await httpGet({
        url: `https://api.agora.io/v1/apps/${appConfig.AGORA_APP_ID}/cloud_recording/resourceid/${resourceId}/sid/${sid}/mode/mix/query`,
      })

      console.log("recording status", recordStatus)
    } catch (err) {
      console.error("query error", err)
    }

    console.log("response", startRecordResult)
    res.send(startRecordResult)
  } catch (err) {
    res.status(500).send(err.response.data || {})
    console.error("error", err)
  }

})

app.post("/api/stop-recording", async (req, res) => {
  try {
    const stopResult = await httpPost({
      url: `https://api.agora.io/v1/apps/${appConfig.AGORA_APP_ID}/cloud_recording/resourceid/${resourceId}/sid/${sid}/mode/mix/stop`,
      payload: {
        "cname": channelName,
        "uid": recordingClientId,
        "clientRequest": {}
      },
      basicAuth: auth
    })
    console.log("stop recording result", stopResult)
    res.send(stopResult)
  } catch (err) {
    console.error("stop recording error", err)
    res.status(500).send(err.response.data || {})
  }

})

app.listen(port, () => {
  console.log(`listeing on ${port}, NODE_ENV =`, process.env.NODE_ENV);
});
