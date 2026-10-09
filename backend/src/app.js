const express = require('express');

const cors = require('cors');
const compression = require('compression');

const cookieParser = require('cookie-parser');
const leadRoutes = require('./routes/erpRoutes/leadRoutes');
const leadImportRoutes = require('./routes/leadImport/leadImportRoutes');
const coreAuthRouter = require('./routes/coreRoutes/coreAuth');
const coreApiRouter = require('./routes/coreRoutes/coreApi');
const coreDownloadRouter = require('./routes/coreRoutes/coreDownloadRouter');
const corePublicRouter = require('./routes/coreRoutes/corePublicRouter');
const adminAuth = require('./controllers/coreControllers/adminAuth');
const metaWebhookRoutes = require('./routes/metaWebhook/metaWebhookRoutes');

const errorHandlers = require('./handlers/errorHandlers');
const erpApiRouter = require('./routes/appRoutes/appApi');

const { requireAdmin } = require('./middlewares/roleAccess');
const employeeRoutes = require('./routes/coreRoutes/employeeRoutes');
const app = express();

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(compression());

// Meta webhook + lead import — mounted after body parsers now
app.use('/', metaWebhookRoutes);
app.use('/lead', adminAuth.isValidAuthToken, leadImportRoutes);

// Here our API Routes
app.use('/lead', adminAuth.isValidAuthToken, leadRoutes);
app.use('/api', coreAuthRouter);
app.use('/api/employees', adminAuth.isValidAuthToken, employeeRoutes);
app.use('/api', adminAuth.isValidAuthToken, coreApiRouter);
app.use('/api', adminAuth.isValidAuthToken, erpApiRouter);
app.use('/download', adminAuth.isValidAuthToken, requireAdmin, coreDownloadRouter);
app.use('/public', (req, res, next) => {
  const publicPart = decodeURIComponent(req.path.split('/')[1] || '');
  if (publicPart === 'download') return adminAuth.isValidAuthToken(req, res, () => requireAdmin(req, res, next));
  next();
}, corePublicRouter);

app.use(errorHandlers.notFound);
app.use(errorHandlers.productionErrors);

module.exports = app;