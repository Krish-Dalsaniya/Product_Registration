const parsePagination = (req) => {
  const page = parseInt(req.query.page, 10) || 1;
  let limit = parseInt(req.query.limit, 10) || 20;
  
  if (limit > 100) limit = 100;
  if (limit < 1) limit = 20;
  
  const offset = (page - 1) * limit;
  
  return { page, limit, offset };
};

module.exports = {
  parsePagination
};
