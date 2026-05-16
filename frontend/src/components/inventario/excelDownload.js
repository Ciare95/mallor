export const getExcelFilename = (headers, fallbackPrefix) => {
  const disposition = headers?.['content-disposition'];
  const match = disposition?.match(/filename="?([^";]+)"?/i);
  return (
    match?.[1]
    || `${fallbackPrefix}_${new Date().toISOString().slice(0, 10)}.xlsx`
  );
};

export const triggerExcelDownload = (
  response,
  fallbackPrefix,
) => {
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.download = getExcelFilename(response.headers, fallbackPrefix);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};
