const recordsService = require("./records.service");
const { success } = require("../../utils/response");

async function listRecords(req, res, next) {
  try {
    const page = req.query.page ? parseInt(req.query.page) : undefined;
    const limit = parseInt(req.query.limit) || 10;
    const { type, categoryId, startDate, endDate, cursor } = req.query;

    const data = await recordsService.listRecords({
      page,
      limit,
      cursor,
      type,
      categoryId,
      startDate,
      endDate,
    });
    return success(res, 200, "Records retrieved", data);
  } catch (err) {
    next(err);
  }
}

async function getRecordById(req, res, next) {
  try {
    const record = await recordsService.getRecordById(req.params.id);
    return success(res, 200, "Record retrieved", record);
  } catch (err) {
    next(err);
  }
}

async function createRecord(req, res, next) {
  try {
    const record = await recordsService.createRecord(req.body, req.user.id);
    return success(res, 201, "Record created", record);
  } catch (err) {
    next(err);
  }
}

async function updateRecord(req, res, next) {
  try {
    const record = await recordsService.updateRecord(req.params.id, req.body);
    return success(res, 200, "Record updated", record);
  } catch (err) {
    next(err);
  }
}

async function deleteRecord(req, res, next) {
  try {
    await recordsService.deleteRecord(req.params.id);
    return success(res, 200, "Record deleted");
  } catch (err) {
    next(err);
  }
}

module.exports = { listRecords, getRecordById, createRecord, updateRecord, deleteRecord };
