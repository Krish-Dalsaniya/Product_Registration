function hasPermission(moduleName, action, permissions) {
    const actionLower = action.toLowerCase();
    const modKey = moduleName.replace(/\s+/g, '').toLowerCase();

    const directKey = `${modKey}.${actionLower}`;
    if (permissions.includes(directKey)) return true;

    if (actionLower === 'view' || actionLower === 'create' || actionLower === 'edit' || actionLower === 'delete') {
       return permissions.some(p => p.startsWith(`${modKey}.`) && p.endsWith(`.${actionLower}`));
    }
    return false;
}
console.log(hasPermission('sales', 'edit', ['sales.view']));
console.log(hasPermission('supporttickets', 'edit', ['supporttickets.view']));

