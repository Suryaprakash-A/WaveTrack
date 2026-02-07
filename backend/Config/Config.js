module.exports = {
  // JWT configuration
  jwt: {
    secret: process.env.JWT_SECRET || "your_jwt_secret_key",
    expiration: process.env.JWT_EXPIRE || "30d",
  },

  // Database configuration
  database: {
    url: process.env.MONGODB_URI || "mongodb+srv://suryaarasu543_db_user:<WruV9MvE4hWjV26x>@cluster0.j4w8yns.mongodb.net/?appName=Cluster0",
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useCreateIndex: true,
      useFindAndModify: false,
    },
  },

  // Rate limiting configuration
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
  },

  // Email configuration
  email: {
    service: process.env.EMAIL_SERVICE || "gmail",
    auth: {
      user: process.env.EMAIL_USERNAME || "udhithtechdev@gmail.com",
      pass: process.env.EMAIL_PASSWORD || "UdhithTechDev@1432",
    },
    from: process.env.EMAIL_FROM || "noreply@udhithwavetrack.com",
  },

  // Default system configurations
  defaults: {
    password: process.env.DEFAULT_PASSWORD || "Udhith@1234",
    adminEmail: process.env.ADMIN_EMAIL || "admin@udhithwavetrack.com",
  },
};
