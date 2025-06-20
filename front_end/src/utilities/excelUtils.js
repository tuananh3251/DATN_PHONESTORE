import React, { useEffect, useRef, useState } from "react";
import { read, utils, writeFile } from "xlsx";
import LoadingIndicator from "./loading.js";
import axios from "axios";
import {
  Dialog,
  DialogContent,
  IconButton,
  Pagination,
  Slide,
  TextField,
  Tooltip,
  Zoom,
  Select, MenuItem, FormControl
} from "@mui/material";
import { Button, Empty, Table } from "antd";
import KeyboardArrowDownOutlinedIcon from "@mui/icons-material/KeyboardArrowDownOutlined";
import { PlusOutlined } from "@ant-design/icons";
import { FaPencilAlt, FaTrashAlt } from "react-icons/fa";
import { FaDownload } from "react-icons/fa6";
import { FaUpload } from "react-icons/fa6";
import useCustomSnackbar from "./notistack.js";
import { format } from "date-fns";
import { request } from "../store/helpers/axios_helper";
import { StatusImei } from "../views/admin/order-manager/enum.js";
import generateRandomCode from "./genCode.js";
const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const downloadImage = (url, filename) => {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
};

const ImportAndExportExcelImei = ({
  open,
  close,
  imeis,
  productName,
  view,
}) => {
  // const getImeis = () => {
  //   get(imeis);
  // }
  const { handleOpenAlertVariant } = useCustomSnackbar();
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef(null);
  const handleUploadClick = () => {
    inputRef.current.click();
  };

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const totalItems = imeis.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = currentPage * itemsPerPage;
  const itemsOnCurrentPage = imeis.slice(startIndex, endIndex);

  const handleDownload = (url, imei) => {
    const imageUrl = url;
    const filename = `barcode-${imei} .jpg`;
    downloadImage(imageUrl, filename);
  };


  // useEffect(() => {
  //   setCurrentPage(1);
  //   setSelectedImei(imeisChuaBan);
  // }, [refresh]);
  // const [imeis, setImeis] = useState(listImei);
  //
  // useEffect(() => {
  //   setImeis(listImei);
  // }, [listImei])

  const handleImport = ($event) => {
    const files = $event.target.files;
    if (files.length) {
      const file = files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const wb = read(event.target.result);
        const sheets = wb.SheetNames;

        if (sheets.length) {
          const rows = utils.sheet_to_json(wb.Sheets[sheets[0]]);

          const nonEmptyRows = rows.filter((row) => {
            return Object.values(row).some(
              (cellValue) => cellValue !== null && cellValue.trim() !== ""
            );
          });
          const updatedRows = nonEmptyRows.map((row) => {
            return {
              imei: row.IMEI,
              createdAt: new Date(),
            };
          });
          // setImeis(updatedRows);
          // getImeis(nonEmptyRows);
        }
        $event.target.value = null;
      };
      reader.readAsArrayBuffer(file);
    }
  };
  const handleExport = () => {
    if (!imeis) {
      handleOpenAlertVariant("Không thể export vì chưa có dữ liệu!", "warning");
    } else {
      const request = {
        imeis,
      };
      setIsLoading(true);
      request("POST", "/api/export-excel-by", request, { responseType: "blob" }) // Sử dụng phương thức POST
        .then((response) => {
          const url = window.URL.createObjectURL(new Blob([response.data]));
          const link = document.createElement("a");
          link.href = url;
          link.setAttribute(
            "download",
            `Danh sách imei của${" " + productName}.xlsx`
          );
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          setIsLoading(false);
        })
        .catch((error) => {
          setIsLoading(false);
        });
    }
    // const headings = [['IMEI']];
    // const wb = utils.book_new();
    // const ws = utils.json_to_sheet([]);
    //
    // utils.sheet_add_aoa(ws, headings);
    // utils.sheet_add_json(ws, imeis, { origin: 'A2', skipHeader: true });
    // utils.book_append_sheet(wb, ws, 'Danh sách imei');
  };

  const handleDownloadSample = () => {
    setIsLoading(true);
    request(
      "POST",
      "/api/create-excel-template-by",
      {},
      { responseType: "blob" }
    ) // Sử dụng phương thức POST
      .then((response) => {
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", "Mẫu Import IMEI.xlsx");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setIsLoading(false);
      })
      .catch((error) => {
        setIsLoading(false);
      });
  };

  const TableImei = () => {
    return (
      <>
        <Table
          className="table-container"
          columns={columns}
          rowKey="id"
          dataSource={itemsOnCurrentPage}
          pagination={false}
          locale={{ emptyText: <Empty description="Không có dữ liệu" /> }}
        />
      </>
    );
  };

  const columns = [
    {
      title: "STT",
      align: "center",
      dataIndex: "stt",
      width: "10%",
      render: (text, record, index) => (
        <span style={{ fontWeight: "400" }}>{imeis.indexOf(record) + 1}</span>
      ),
    },
    {
      title: "IMEI",
      align: "center",
      width: "15%",
      render: (text, record) => (
        <span style={{ fontWeight: "400" }}>
          {!view ? record.soImei : record.imei}
        </span>
      ),
    },
    {
      title: "Trạng thái",
      align: "center",
      width: "15%",
      dataIndex: "trangThai",
      render: (type) =>
        type === StatusImei.SOLD ? (
          <div
            className="rounded-pill mx-auto badge-primary"
            style={{
              height: "35px",
              width: "110px",
              padding: "4px",
            }}
          >
            <span className="text-white" style={{ fontSize: "14px" }}>
              Đã Bán
            </span>
          </div>
        ) : type === StatusImei.NOT_SOLD || type === StatusImei.IN_THE_CART  || type === StatusImei.PENDING_DELIVERY ? (
          <div
            className="rounded-pill badge-success mx-auto"
            style={{ height: "35px", width: "110px", padding: "4px" }}
          >
            <span className="text-white" style={{ fontSize: "14px" }}>
              Chưa Bán
            </span>
          </div>
        ) : type === StatusImei.IN_ACTIVE ? (
          <div
            className="rounded-pill badge-danger mx-auto"
            style={{ height: "35px", width: "145px", padding: "4px" }}
          >
            <span className="text-white" style={{ fontSize: "14px" }}>
              Ngừng hoạt động
            </span>
          </div>
        ) : type === StatusImei.REFUND ? (
          <div
            className="rounded-pill badge-danger mx-auto"
            style={{ height: "35px", width: "110px", padding: "4px" }}
          >
            <span className="text-white" style={{ fontSize: "14px" }}>
              Hoàn Trả
            </span>
          </div>
        ) : (
          ""
        ),
    },
    {
      title: "Barcode",
      align: "center",
      width: "15%",
      hide: view ? true : false,
      render: (text, record) => (
        <img
          src={record.barcode}
          style={{ width: "200px", height: "50px" }}
          alt=""
        />
      ),
    },
    {
      title: "Thao Tác",
      align: "center",
      width: "15%",
      render: (text, record) => (
        <>
          <div className="d-flex justify-content-center">
            <div className="button-container">
              <Tooltip title="Cập Nhật" TransitionComponent={Zoom}>
                <IconButton size="" className="me-2" onClick={() => { }}>
                  <FaPencilAlt color="#2f80ed" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Tải Ảnh Barcode" TransitionComponent={Zoom}>
                <IconButton size="" onClick={() => { handleDownload(record.barcode, record.soImei) }}>
                  <FaDownload color="#e5383b" />
                </IconButton>
              </Tooltip>
            </div>
          </div>
        </>
      ),
    },
  ].filter((item) => !item.hide);

  return (
    <>
      <Dialog
        open={open}
        TransitionComponent={Transition}
        keepMounted
        onClose={close}
        maxWidth="xxl"
        maxHeight="xxl"
      // sx={{ marginBottom: !imeis ? "170px" : "" }}
      >
        <DialogContent className="">
          <div className="mt-2" style={{ width: "1100px" }}>
            <div className="container" style={{}}>
              <div className="text-center" style={{}}>
                <span
                  className=""
                  style={{ fontWeight: "550", fontSize: "29px" }}
                >
                  {"Danh sách IMEI của " + productName}
                </span>
              </div>
              <div className="d-flex mt-4 justify-content-between">
                <div className="header-title">
                  <TextField
                    label="Tìm kiếm IMEI"
                    // onChange={handleGetValueFromInputTextField}
                    // value={keyword}
                    InputLabelProps={{
                      sx: {
                        marginTop: "",
                        textTransform: "capitalize",
                      },
                    }}
                    inputProps={{
                      style: {
                        height: "23px",
                        width: "200px",
                      },
                    }}
                    size="small"
                    className=""
                  />
                  <Button
                    onClick={() => console.log()}
                    className="rounded-2 ms-2"
                    type="warning"
                    style={{ width: "100px", fontSize: "15px" }}
                  >
                    <span
                      className="text-dark"
                      style={{ fontWeight: "500", marginBottom: "2px" }}
                    >
                      Làm Mới
                    </span>
                  </Button>
                </div>
                <div className="d-flex">
                  <div className="d-flex mx-auto me-3">
                    <div
                      className="d-flex ms-3"
                      style={{
                        height: "40px",
                        position: "relative",
                        cursor: "pointer",
                      }}
                    >
                      <div
                        // onClick={handleOpenSelect1}
                        className=""
                        style={{ marginTop: "8px" }}
                      >
                        <span
                          className="ms-2 ps-1"
                          style={{ fontSize: "15px", fontWeight: "450" }}
                        >
                          Trạng Thái:{""}
                        </span>
                      </div>
                      <FormControl
                        sx={{
                          minWidth: 50,
                        }}
                        size="small"
                      >
                        <Select
                          MenuProps={{
                            PaperProps: {
                              style: {
                                borderRadius: "7px",
                              },
                            },
                          }}
                          IconComponent={KeyboardArrowDownOutlinedIcon}
                          sx={{
                            "& .MuiOutlinedInput-notchedOutline": {
                              border: "none !important",
                            },
                            "& .MuiSelect-select": {
                              color: "#2f80ed",
                              fontWeight: "500",
                            },
                          }}
                          // open={openSelect1}
                          // onClose={handleCloseSelect1}
                          // onOpen={handleOpenSelect1}
                          defaultValue={14}
                        >
                          <MenuItem className="" value={14}>
                            Tất cả
                          </MenuItem>
                          <MenuItem value={15}>Chưa Bán</MenuItem>
                          <MenuItem value={20}>Đã Bán</MenuItem>
                          <MenuItem value={25}>Hoàn Trả</MenuItem>
                          <MenuItem value={30}>Ngưng Hoạt Động</MenuItem>
                        </Select>
                      </FormControl>
                    </div>
                  </div>
                  {!view && (
                    <Button
                      onClick={handleExport}
                      className="rounded-2 button-mui me-2"
                      type="primary"
                      style={{
                        height: "40px",
                        width: "auto",
                        fontSize: "15px",
                      }}
                    >
                      <FaDownload
                        className="ms-1"
                        style={{
                          position: "absolute",
                          bottom: "13.5px",
                          left: "10px",
                        }}
                      />
                      <span
                        className="ms-3 ps-1"
                        style={{ marginBottom: "3px", fontWeight: "500" }}
                      >
                        Export Excel
                      </span>
                    </Button>
                  )}
                  <Button
                    className="rounded-2"
                    type="warning"
                    style={{ height: "40px", width: "120px", fontSize: "15px" }}
                  >
                    <span className='' style={{ fontSize: "15px", fontWeight: "500", marginBottom: "2px" }}>
                      Quét Barcode
                    </span>
                  </Button>
                </div>
              </div>
              <div className="mx-auto mt-3">
                <TableImei />
              </div>
              <div className="d-flex justify-content-center mt-3">
                <Pagination
                  color="primary"
                  page={parseInt(currentPage)}
                  count={totalPages}
                  onChange={(event, page) => setCurrentPage(page)}
                />
              </div>
            </div>
          </div>
        </DialogContent>
        <div className="mt-3"></div>
      </Dialog>
      {isLoading && <LoadingIndicator />}
    </>
  );
};

export default ImportAndExportExcelImei;
