import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "antd";
import {
  FormControl,
  InputLabel,
  MenuItem,
  TextField,
  Autocomplete,
  InputAdornment,
  Dialog,
  DialogContent,
  Slide,
  Select,
} from "@mui/material";
import axios from "axios";
import LoadingIndicator from "../../../utilities/loading";
import generateRandomCode from "../../../utilities/randomCode";
import useCustomSnackbar from "../../../utilities/notistack";
import { Notistack, StatusCommonProductsNumber } from "./enum";
import { request } from "../../../store/helpers/axios_helper";

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const CreatePin = ({ open, close, getAll, pins }) => {
  const navigate = useNavigate();
  const [dungLuong, setDungLuong] = useState("");
  const [loaiPin, setLoaiPin] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [status, setStatus] = React.useState(StatusCommonProductsNumber.ACTIVE);
  const { handleOpenAlertVariant } = useCustomSnackbar();

  const handleChangeDungLuong = (event, value) => {
    const cleanedValue = value.replace(/\D/g, "");
    setDungLuong(cleanedValue);
  };

  const handleChangePin = (event, value) => {
    setLoaiPin(value);
  };

  const uniqueDungLuong = pins
    .map((option) => option.dungLuong.toString())
    .filter((value, index, self) => {
      return self.indexOf(value) === index;
    });

  const uniqueLoaiPin = pins
    .map((option) => option.loaiPin)
    .filter((value, index, self) => {
      return self.indexOf(value) === index;
    });

  const handleChangeStatus = (event) => {
    setStatus(event.target.value);
  };

  const handleReset = (event) => {
    setStatus(StatusCommonProductsNumber.ACTIVE);
    setLoaiPin("");
    setDungLuong("");
    setValidationMsg({});
  };

  const [validationMsg, setValidationMsg] = useState({});

  const validationAll = () => {
    const msg = {};

    const isDuplicate = pins.some(
      (products) =>
        products.loaiPin === loaiPin && products.dungLuong == dungLuong
    );

    if (isDuplicate) {
      handleOpenAlertVariant("Pin đã tồn tại", Notistack.ERROR);
      msg = "Đã tồn tại";
    }

    if (loaiPin.trim() === "") {
      msg.loaiPin = "Loại pin không được trống.";
    }

    if (dungLuong.trim() === "") {
      msg.dungLuong = "Dung lượng pin không được trống.";
    }

    if (dungLuong < 1) {
      msg.dungLuong = "Dung lượng pin không được nhỏ hơn 1 mAh.";
    }

    if (dungLuong > 100000) {
      msg.dungLuong = "Dung lượng pin không được lớn hơn 100.000 mAh.";
    }

    setValidationMsg(msg);
    if (Object.keys(msg).length > 0) return false;
    return true;
  };

  const handleSubmit = () => {
    const isValid = validationAll();
    if (!isValid) return;
    addPins();
  };

  const addPins = () => {
    let obj = {
      ma: generateRandomCode(),
      loaiPin: loaiPin,
      dungLuong: dungLuong,
      status: status,
    };
    request("POST", `/api/pins`, obj)
      .then((response) => {
        close();
        getAll();
        handleReset();
        handleOpenAlertVariant("Thêm thành công!!!", Notistack.SUCCESS);
      })
      .catch((error) => {
        handleOpenAlertVariant(error.response.data.message, Notistack.ERROR);
      });
  };

  return (
    <>
      <Dialog
        open={open}
        TransitionComponent={Transition}
        keepMounted
        onClose={close}
        maxWidth="md"
        maxHeight="md"
        sx={{
          marginBottom: "100px",
        }}
      >
        <DialogContent className="">
          <div className="mt-4" style={{ width: "700px" }}>
            <div className="container" style={{}}>
              <div className="text-center" style={{}}>
                <span
                  className=""
                  style={{ fontWeight: "550", fontSize: "29px" }}
                >
                  THÊM PIN
                </span>
              </div>
              <div className="mx-auto mt-3 pt-2">
                <div>
                  <Autocomplete
                    fullWidth
                    className="custom"
                    id="free-solo-demo"
                    freeSolo
                    inputValue={loaiPin}
                    onInputChange={handleChangePin}
                    options={uniqueLoaiPin}
                    renderInput={(params) => (
                      <TextField {...params} label="Loại PIN" />
                    )}
                    error={loaiPin.tenHang !== undefined}
                    helperText={validationMsg.loaiPin}
                  />
                </div>
                <div className="mt-3">
                  <Autocomplete
                    fullWidth
                    className="custom"
                    id="free-solo-demo"
                    freeSolo
                    inputValue={dungLuong}
                    onInputChange={handleChangeDungLuong}
                    options={uniqueDungLuong}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        InputProps={{
                          ...params.InputProps,
                          startAdornment: (
                            <>
                              <InputAdornment
                                style={{ marginLeft: "5px" }}
                                position="start"
                              >
                                mAh
                              </InputAdornment>
                              {params.InputProps.startAdornment}
                            </>
                          ),
                        }}
                        label="Dung Lượng PIN"
                        error={validationMsg.dungLuong !== undefined}
                        helperText={validationMsg.dungLuong}
                      />
                    )}
                  />
                </div>
                {/* <div className="mt-3" style={{}}>
                  <FormControl fullWidth>
                    <InputLabel id="demo-simple-select-label">
                      Trạng Thái
                    </InputLabel>
                    <Select
                      disabled={true}
                      className="custom"
                      labelId="demo-simple-select-label"
                      id="demo-simple-select"
                      value={status}
                      label="Trạng Thái"
                      style={{
                        pointerEvents: "none",
                        opacity: 0.5,
                      }}
                      onChange={handleChangeStatus}
                      defaultValue={StatusCommonProductsNumber.ACTIVE}
                    >
                      <MenuItem value={StatusCommonProductsNumber.ACTIVE}>
                        Hoạt Động
                      </MenuItem>
                      <MenuItem value={StatusCommonProductsNumber.IN_ACTIVE}>
                        Ngừng Hoạt Động
                      </MenuItem>
                    </Select>
                  </FormControl>
                </div> */}
                <div className="mt-4 pt-1 d-flex justify-content-end">
                  <Button
                    onClick={() => {
                      close();
                      handleReset();
                    }}
                    className="rounded-2 me-2 button-mui"
                    type="error"
                    style={{ height: "40px", width: "auto", fontSize: "15px" }}
                  >
                    <span
                      className=""
                      style={{ marginBottom: "2px", fontWeight: "500" }}
                    >
                      Hủy
                    </span>
                  </Button>
                  <Button
                    onClick={() => handleSubmit()}
                    className="rounded-2 button-mui"
                    type="primary"
                    style={{ height: "40px", width: "auto", fontSize: "15px" }}
                  >
                    <span
                      className=""
                      style={{ marginBottom: "2px", fontWeight: "500" }}
                    >
                      Xác Nhận
                    </span>
                  </Button>
                </div>
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
export default CreatePin;
