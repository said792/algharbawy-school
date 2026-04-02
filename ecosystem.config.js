module.exports = {
  apps : [
    {
      name   : "school-api",
      script : "./server.js",
      env: {
        NODE_ENV: "production"
      }
    },
    {
      name   : "school-front",
      // التعديل هنا: استخدام npm.cmd و تمرير الأمر start كـ argument
      script : "npm.cmd", 
      args   : "start",
      env: {
        PORT: 3000
      }
    }
  ]
}