
# React Native Video Call Demo App with agora.io
A demo application made with React Native to show how to make a recorded video call with https://agora.io.
The purpose of the demo is just to build something that works, and is way far to be a complete app
## **WHAT'S INCLUDED?**

**REACT NATIVE APP**
I started from [their sample app](https://github.com/AgoraIO-Community/Agora-RN-Quickstart), which is a very good starting point, and "translated" their class component in a function component. I also added some logic to 

 - toggle audio and video state
 - show "end call" button only when the call is in progress
 - auto quit when you remain alone

The demo is tailored for 1-to-1 calls, so also the layout has been customized to be shown in tile view, where the screen is split vertically in 2 equals parts.

To start the recording you have to manually call the endpoints of the included server.

TO START THE APP:
- clone the repo
- cd app
- set your agora app id in App.tsx, line 21
- yarn
- yarn ios/yarn android

**EXPRESS JS NODE BACKEND FOR RECORDING**
A very basilar node express js server with 2 endpoints to start and stop a recording
**⚠️⚠️ WARNING⚠️⚠️**
**NOT READY FOR PRODUCTION**
This server is just meant to:
- be as simple as possible (just an handy back-end to quickly try it our)
- be called manually with curl or postman (**the app does not call these endpoints**)
- record always on the same channel, and the stop call is made using two variables coming from the previous call to start recording. Depending on your value of `maxIdleTime` in the first call, if you start a recording and do not explicitly stop it, you have to wait `maxIdleTime` seconds before being able to call the acquire endpoint with the same `uid`
- record in tile mode with a custom configuration (as you see it during the call)

TO START THE SERVER
- clone the repo
- cd server
- fill the api keys etc in src/appConfig.ts
- yarn
- yarn start
 


## TO BE ADDED
- integration with https://github.com/react-native-webrtc/react-native-callkit
- support picture in picture
