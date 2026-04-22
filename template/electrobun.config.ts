export default {
  app: {
    name: "pi-agent-template",
    identifier: "com.piagent.template",
    version: "1.0.0",
  },
  build: {
    copy: {
      "src/dist": "views",
    },
  },
};
