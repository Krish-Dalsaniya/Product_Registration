const { sendSuccess } = require('../../../../utils/response');

const getDashboardMetrics = async (req, res, next) => {
  try {
    // In a real application, these would be fetched from DB
    const metrics = {
      totalEmployees: 142,
      onLeaveToday: 8,
      openPositions: 12,
      avgAttendance: 94
    };
    sendSuccess(res, metrics, 'HR Dashboard metrics fetched successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardMetrics
};
