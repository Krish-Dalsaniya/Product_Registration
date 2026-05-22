import axiosInstance from './axiosInstance';

const API_BASE = '/api';

/**
 * Get all custom category names saved for a given inventory module.
 * @param {'electrical'|'electronics'|'structural'} module
 */
export const getCustomCategories = async (module) => {
  const res = await axiosInstance.get(`/inventory/${module}/custom-categories`);
  return res.data;
};

/**
 * Get the custom field definitions for a specific module + category.
 * @param {'electrical'|'electronics'|'structural'} module
 * @param {string} categoryName
 */
export const getCategoryFields = async (module, categoryName) => {
  const encoded = encodeURIComponent(categoryName);
  const res = await axiosInstance.get(`/inventory/${module}/categories/${encoded}/fields`);
  return res.data;
};

/**
 * Save (upsert) the custom field definitions for a module + category.
 * @param {'electrical'|'electronics'|'structural'} module
 * @param {string} categoryName
 * @param {Array<{label: string, key: string}>} fields
 */
export const saveCategoryFields = async (module, categoryName, fields) => {
  const encoded = encodeURIComponent(categoryName);
  const res = await axiosInstance.post(`/inventory/${module}/categories/${encoded}/fields`, { fields });
  return res.data;
};

/**
 * Delete a custom category
 * @param {'electrical'|'electronics'|'structural'} module
 * @param {string} categoryName
 */
export const deleteCustomCategory = async (module, categoryName) => {
  const encoded = encodeURIComponent(categoryName);
  const res = await axiosInstance.delete(`/inventory/${module}/categories/${encoded}`);
  return res.data;
};
