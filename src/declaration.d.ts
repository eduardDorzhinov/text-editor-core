interface Window {
  TextCreator: {
    getDataCallback: (uid: string) => object,
    htmlToSave: string,
    jsonToSave: object,
    upload_objuid: string,
    upload_field: string,
    upload_tpl: string,
    saveCallback: (uid: string, { html: string, json: object }) => void,
  },
}
