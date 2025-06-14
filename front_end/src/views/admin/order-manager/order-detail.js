import React, { useState, useEffect, useRef } from "react";
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { styled } from "@mui/material/styles";
import { Row, Col } from "react-bootstrap";
import {
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { Button, Empty, Table } from "antd";
import axios from "axios";
import {
  FaTruck,
  FaRegCalendarCheck,
  FaRegFileAlt,
  FaRegCalendarTimes,
  FaBusinessTime,
  FaPencilAlt,
} from "react-icons/fa";
import { FaArrowRotateLeft, FaArrowsRotate } from "react-icons/fa6";
import { Tooltip, Zoom } from "@mui/material";
import LoadingIndicator from "../../../utilities/loading";
import Card from "../../../components/Card";
import styleCss from "./style.css";
import { format } from "date-fns";
import { Timeline, TimelineEvent } from "@mailtop/horizontal-timeline";
import Box from "@mui/joy/Box";
import Alert from "@mui/joy/Alert";
import {
  UpdateRecipientOrderDialog,
  PaymentDialog,
  OrderHistoryDialog,
  ConfirmDialog,
  MultiplePaymentMethodsDelivery,
  ProductsDialog,
  ModalUpdateImeiByProductItem,
  ModalRefundProduct,
  ScannerBarcode,
  ModalViewImeiHadBuy,
  ConfirmRollbackStatusOrder,
  ConfirmRollBack,
} from "./AlertDialogSlide.js";
import {
  OrderStatusString,
  OrderTypeString,
  Notistack,
  StatusImei,
} from "./enum";
import useCustomSnackbar from "../../../utilities/notistack";
import { add } from "lodash";
import { FaMoneyBillTransfer, FaMoneyCheckDollar } from "react-icons/fa6";
import InputNumberAmount from "./input-number-amount-product";
import { over } from "stompjs";
import SockJS from "sockjs-client";
import PrinterInvoice, { Print, PrintBillAtTheCounter, PrintBillDelivery, PrintDelivery } from "./printer-invoice";
import { useSelector } from "react-redux";
import { request } from "../../../store/helpers/axios_helper";
import { getUser } from "../../../store/user/userSlice";
import { useReactToPrint } from "react-to-print";

var stompClient = null;
const OrderDetail = (props) => {
  const navigate = useNavigate();
  const location = useLocation();
  const paramValue = location.state?.param;
  const [orderItemsCompleted, setOrderItemsCompleted] = useState(false);

  const componentRef = useRef();
  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
  });

  const componentRef1 = useRef();
  const handlePrint1 = useReactToPrint({
    content: () => componentRef1.current,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isPrint, setIsPrint] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  const [vouchersActive, setVouchersActive] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isRefund, setIsRefund] = useState(false);
  const [order, setOrder] = useState({});
  const [orderHistories, setOrderHistories] = useState([]);
  const [status, setStatus] = useState();
  const [paymentHistorys, setPaymentHistorys] = useState([]);
  const [orderItems, setOrderItems] = useState([]);
  const [codeDiscount, setCodeDiscount] = useState("");
  const [orderItemRefund, setOrderItemRefund] = useState([]);
  const { id } = useParams();
  const { handleOpenAlertVariant } = useCustomSnackbar();
  const [addressDefault, setAddressDefault] = useState("");

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerNote, setCustomerNote] = useState("");
  const [customerProvince, setCustomerProvince] = useState("");
  const [customerDistrict, setCustomerDistrict] = useState("");
  const [customerWard, setCustomerWard] = useState("");
  const [size, setSize] = useState();

  const [openOrder, setOpenOrder] = useState(false);

  const handleCloseOpenOrder = () => {
    setOpenOrder(false);
  };

  const handleOpenOrder = () => {
    setOpenOrder(true);
  };

  const [openPayment, setOpenPayment] = useState(false);
  const [openScanner, setOpenScanner] = useState(false);
  const [scannerRef, setScannerRef] = useState([]);

  const userId = getUser().id;

  const totalDiscount = (tongTien, tongTienSauKhiGiam) => {
    return tongTien - tongTienSauKhiGiam;
  };

  const handleOpenScanner = () => {
    setOpenScanner(true);
  };

  const handleCloseOpenScanner = () => {
    setOpenScanner(false);
  };
  const filteredItems = orderHistories.filter((item) =>
    [1, 3, 4].includes(item.loaiThaoTac)
  );

  const getVouchersIsActiveAll = () => {
    request("GET", `/voucher/voucherActive/all`, {})
      .then((response) => {
        setVouchersActive(response.data.data);
      })
      .catch((error) => {
        console.error(error);
      });
  };
  const largestItem =
    filteredItems &&
    filteredItems.sort((a, b) => b.loaiThaoTac - a.loaiThaoTac)[0];

  const getStatusToRollBack = () => {
    return order.trangThai === OrderStatusString.CONFIRMED
      ? "Chờ xác nhận"
      : order.trangThai === OrderStatusString.DELIVERING
        ? "Chờ giao hàng"
        : order.trangThai === OrderStatusString.SUCCESS_DELIVERY
          ? "Đang giao hàng"
          : "";
  };

  const checkImeisDaBan = () => {
    return orderItems.some((item) => item.imeisDaBan.length === 0);
  };

  const updateInfoOrderDelivery = async (
    name,
    phone,
    address,
    province,
    district,
    ward,
    note,
    ship
  ) => {
    setIsLoading(true);
    const data = {
      id: id,
      tenNguoiNhan: name,
      soDienThoaiNguoiNhan: phone,
      diaChiNguoiNhan: address,
      tinhThanhPhoNguoiNhan: province,
      quanHuyenNguoiNhan: district,
      xaPhuongNguoiNhan: ward,
      phiShip: ship,
      ghiChu: note,
      createdBy: userId,
    };
    try {
      await request("PUT", `/api/orders/update-info-delivery`, data).then(
        async (response) => {
          await getOrderItemsById();
          handleOpenAlertVariant(
            "Cập nhật thông tin đơn hàng thành công ",
            Notistack.SUCCESS
          );
          handleCloseDialogUpdateRecipientOrder();
          setIsLoading(false);
        }
      );
    } catch (error) {
      handleOpenAlertVariant(error.response.data.message, "warning");
      setIsLoading(false);
    }
  };

  const rollBackStatus = async (note) => {
    setIsLoading(true);
    const data = {
      id: id,
      orderHistory: largestItem,
      statusOrder: getStatusToRollBack(),
      note: note,
      createdBy: userId,
    };
    try {
      await request("PUT", `/api/orders/roll-back-status`, data).then(
        async (response) => {
          await getOrderItemsById();
          handleOpenAlertVariant("Hoàn tác thành công ", Notistack.SUCCESS);
          handleCloseOpenRollback();
          setIsLoading(false);
        }
      );
    } catch (error) {
      handleOpenAlertVariant(error.response.data.message, "warning");
      setIsLoading(false);
    }
  };

  const addProductToOrderByScanner = async (imei) => {
    setIsLoading(true);
    const data = {
      amount: 1,
      order: {
        id: order.id,
      },
      imei: imei,
    };
    try {
      await request("PUT", `/api/carts/order/scanner`, data).then(
        async (response) => {
          await getOrderItemsById();
          handleCloseOpenScanner();
          handleOpenAlertVariant(
            "Thêm sản phẩm thành công ",
            Notistack.SUCCESS
          );
          setIsLoading(false);
        }
      );
    } catch (error) {
      handleOpenAlertVariant(error.response.data.message, "warning");
      handleCloseOpenScanner();
      setIsLoading(false);
    }
  };

  const [customers, setCustomers] = useState([]);

  const getCustomers = () => {
    axios
      .get(`http://localhost:8080/nhan-vien/all/no-page`)
      .then((response) => {
        setCustomers(response.data.data);
      })
      .catch((error) => {
        console.error("Error");
      });
  };

  //connnect
  const connect = () => {
    let Sock = new SockJS("http://localhost:8080/ws");
    stompClient = over(Sock);
    stompClient.connect({}, onConnected, onError);
  };

  const onConnected = () => {
    stompClient.subscribe("/bill/bills", onMessageReceived);
  };

  const onMessageReceived = (payload) => {
    var payloadData = JSON.parse(payload.body);
  };

  const onError = (err) => {
    console.log(err);
  };

  const handleCloseOpenPayment = () => {
    setOpenPayment(false);
  };
  const [products, setProducts] = useState([]);
  const [openProducts, setOpenProducts] = useState(false);
  const handleCloseOpenProducts = () => {
    setIsOpen(false);
    setOpenProducts(false);
  };
  const [openModalImei, setOpenModalImei] = useState(false);
  const handleOpenModalImei = () => {
    setOpenModalImei(true);
  };
  const handleCloseOpenModalImei = () => {
    setOpenModalImei(false);
  };
  const getAllProducts = async () => {
    request("GET", `/api/products/product-items`)
      .then((response) => {
        setProducts(response.data.data);
      })
      .catch((error) => {
        console.error("Error");
      });
  };
  const [openModalUpdateImei, setOpenModalUpdateImei] = useState(false);
  const handleOpenModalUpdateImei = () => {
    setOpenModalUpdateImei(true);
  };
  const handleCloseOpenModalUpdateImei = () => {
    setOpenModalUpdateImei(false);
  };
  const [idOrderItem, setIdOrderItem] = useState("");
  const [orderItem, setOrderItem] = useState({});
  const [itemImg, setItemImg] = useState("");
  const [itemPrice, setItemPrice] = useState("");
  const [itemName, setItemName] = useState("");
  const [imeis, setImeis] = useState([]);
  const [productName, setProductName] = useState("");
  const [selectedImei, setSelectedImei] = useState([]);
  const [selectedImeiRefresh, setSelectedImeiRefresh] = useState([]);

  const [openViewImei, setOpenViewImei] = useState(false);
  const [viewImeis, setViewImeis] = useState([]);

  const handleCloseOpenViewImei = () => {
    setOpenViewImei(false);
  };

  const [openModalRefund, setOpenModalRefund] = useState(false);

  const handleCloseOpenModalRefund = () => {
    setOpenModalRefund(false);
  };

  const totalAmountProduct = () => {
    let totalAmount = 0;
    orderItems &&
      orderItems.map((item) => {
        totalAmount += item.soLuong;
      });
    return totalAmount;
  };

  const filteredData =
    selectedImei &&
    selectedImei.filter((item) => item.trangThai !== StatusImei.REFUND);

  const addCartItemsToCartOrder = async (cartItems) => {
    setIsLoading(true);
    const data = {
      amount: cartItems.amount,
      price: cartItems.price,
      order: {
        id: cartItems.orderId,
      },
      productItem: {
        id: cartItems.productId,
      },
      imeis: cartItems.imeis,
      productName: cartItems.productName,
      user: cartItems.user
    };
    try {
      await request("PUT", `/api/carts/order`, data).then(async (response) => {
        await getOrderItemsById();
        handleCloseOpenModalImei();
        handleCloseOpenProducts();
        handleOpenAlertVariant("Thêm sản phẩm thành công ", Notistack.SUCCESS);
        setIsLoading(false);
        setIsOpen(false);
      });
    } catch (error) {
      handleOpenAlertVariant(error.response.data.message, "warning");
      setIsLoading(false);
      // setIsOpen(false);
    }
  };
  const handleAddProductToCartOrder = (price, id, imeis, name) => {
    const amount = imeis && imeis.length;
    const cartItems = {
      amount: amount,
      price: price,
      orderId: order.id,
      productId: id,
      imeis: imeis,
      productName: name,
      user: userId
    };
    if (imeis.length > 0) {
      addCartItemsToCartOrder(cartItems);
    }
  };

  const handleDeleteCartItemOrderById = async (id, amount, name) => {
    setIsLoading(true);
    const data = {
      amount: amount,
      productName: name,
      user: userId
    };
    try {
      await request("DELETE", `/api/carts/order/${id}`, data).then(
        async (response) => {
          await getOrderItemsById();
          setIsLoading(false);
          handleOpenAlertVariant(
            "Xóa thành công sản phẩm khỏi giỏ hàng!",
            Notistack.SUCCESS
          );
        }
      );
    } catch (error) {
      console.log(error);
    }
  };

  const handleUpdateAmountCartItemOrder = async (imeis) => {
    setIsLoading(true);
    const requestBody = {
      id: idOrderItem,
      amount: imeis && imeis.length,
      imeis: imeis,
      order: {
        id: order.id,
      },
      productName: productName,
      user: userId
    };
    try {
      await request("PUT", `/api/carts/order/amount`, requestBody).then(
        async (response) => {
          await getOrderItemsById();
          handleCloseOpenModalUpdateImei();
          handleCloseOpenOrder();
          handleOpenAlertVariant(
            "Cập nhật số lượng thành công!",
            Notistack.SUCCESS
          );
          setIsLoading(false);
        }
      );
    } catch (error) {
      setIsLoading(false);
      handleOpenAlertVariant(error.response.data.message, "warning");
      console.error("Error");
    }
  };

  const [total, setTotal] = useState(0);

  const getOrderItemsById = async () => {
    setIsLoading(true);
    await request("GET", `/api/orders/${id}`)
      .then((response) => {
        const data = response.data.data;
        setOrder(data);
        setOrderItemsCompleted(true);
        const sortOrderHistories =
          data.orderHistories &&
          data.orderHistories.sort(
            (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
          );
        setOrderHistories(sortOrderHistories);
        const sortPayments =
          data.paymentMethods &&
          data.paymentMethods.sort(
            (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
          );
        setPaymentHistorys(sortPayments);
        setOrderItems(data.orderItems);

        const address =
          data &&
          data.account &&
          data.account.diaChiList &&
          data.account.diaChiList.find((item) => item.trangThai === 1);
        const getAddressDefault =
          address &&
          address.diaChi +
          ", " +
          address.xaPhuong +
          ", " +
          address.quanHuyen +
          ", " +
          address.tinhThanhPho;
        setAddressDefault(getAddressDefault);

        if (data.loaiHoaDon === OrderTypeString.DELIVERY) {
          setCustomerName(data.tenNguoiNhan === null ? "" : data.tenNguoiNhan);
          setCustomerPhone(
            data.soDienThoaiNguoiNhan === null ? "" : data.soDienThoaiNguoiNhan
          );
          setCustomerAddress(
            data.diaChiNguoiNhan === null ? "" : data.diaChiNguoiNhan
          );
          setCustomerDistrict(
            data.quanHuyenNguoiNhan === null ? "" : data.quanHuyenNguoiNhan
          );
          setCustomerProvince(
            data.tinhThanhPhoNguoiNhan === null
              ? ""
              : data.tinhThanhPhoNguoiNhan
          );
          setCustomerWard(
            data.xaPhuongNguoiNhan === null ? "" : data.xaPhuongNguoiNhan
          );
          setCustomerNote(data.ghiChu === null ? "" : data.ghiChu);
        }

        const tongTien = (data && data.tongTien) || 0;
        const discount =
          (data && data.voucher && data.voucher.giaTriVoucher) || 0;
        const phiShip = (data && data.phiShip) || 0;
        setTotal(tongTien - discount + phiShip);

        if (data.trangThai === OrderStatusString.HAD_PAID) {
        }
        setIsLoading(false);
      })
      .catch((error) => {
        console.error(error);
        setIsLoading(false);
      });
  };
  const orderItemsSort = orderItems.sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );

  const orderImeis = orderItems.flatMap((order) => {
    return order.imeisDaBan.map((item) => {
      return {
        ...order,
        trangThai: item.trangThai,
        imei: item.soImei,
      };
    });
  });

  useEffect(() => {
    getOrderItemsById();
    getCustomers();
    getVouchersIsActiveAll();
    if (stompClient === null) {
      connect();
    }
  }, []);

  useEffect(() => {
    // Kiểm tra nếu đã hoàn thành getOrderItemsById và có paramValue
    if (orderItemsCompleted && paramValue) {
      handlePrint();
      window.history.replaceState({}, document.title);
    }
  }, [orderItemsCompleted, paramValue]);

  const [maxAmount, setMaxAmount] = useState(0);

  const totalItem = (amount, price) => {
    return amount * price;
  };

  const countPrice = (price, afterDiscount) => {
    return price - afterDiscount;
  };

  const totalOrder = (total, discount, feeShip) => {
    return total - discount + feeShip;
  };

  const updateStatusOrderDelivery = async (orderRequest) => {
    setIsLoading(true);
    try {
      await request(
        "PUT",
        `/api/orders/${id}?isUpdateStatusOrderDelivery=true`,
        orderRequest
      ).then(async (response) => {
        await getOrderItemsById();
        var test = {
          name: "test2" + Math.random(),
        };
        if (stompClient) {
          stompClient.send("/app/bills", {}, JSON.stringify(test));
        }
        setIsLoading(false);
        if (orderRequest.trangThai === OrderStatusString.CONFIRMED) {
          setIsPrint(true);
        }
        if (orderRequest.trangThai === OrderStatusString.SUCCESS_DELIVERY && order.tienKhachTra < order.khachCanTra) {
          await handlePaymentOrder("Chuyển khoản", order.khachCanTra - order.tienKhachTra)
        }
        setOpenCommon(false);
        handleOpenAlertVariant("Xác nhận thành công", "success");
      });
    } catch (error) {
      const message = error.response.data.message;
      setIsLoading(false);
      handleOpenAlertVariant(message, Notistack.ERROR);
      console.log(error.response.data);
    }
  };

  useEffect(() => {
    if (isPrint) {
      handlePrint1();
      setIsPrint(false);
    }
  }, [isPrint]);

  const handlePaymentOrder = async (type, total) => {
    setIsLoading(true);
    const orderRequest = {
      tienKhachTra: total,
      id: id,
      hinhThucThanhToan:
        type === "Chuyển khoản" ? "Chuyển khoản thường" : "Tiền mặt",
      hoanTien: isRefund === true ? "Hoàn tiền" : "",
      createdByPayment: userId,
    };
    try {
      await request("PUT", `/api/vnpay/payment/delivery`, orderRequest).then(
        (response) => {
          const order = response.data.data;
          setOrder(order);
          setPaymentHistorys(order.paymentMethods);
          handleCloseOpenPayment();
          var test = {
            name: "test3",
          };
          if (stompClient) {
            stompClient.send("/app/bills", {}, JSON.stringify(test));
          }
          handleOpenAlertVariant(
            "Xác nhận thanh toán thành công",
            Notistack.SUCCESS
          );
          setIsRefund(false);
          setIsLoading(false);
        }
      );
    } catch (error) {
      const message = error.response.data.message;
      setIsLoading(false);
      setIsRefund(false);
      handleOpenAlertVariant(message, Notistack.ERROR);
      console.log(error.response.data);
    }
  };

  const soTienThanhToan = 15000000;
  const handleAddPayment = () => {
    const newPayment = {
      ma: "20219128391",
      loaiThanhToan: 0,
      hinhThucThanhToan: 0,
      trangThai: 1,
      createdAt: new Date(),
      soTienThanhToan: 20000000,
      nguoiXacNhan: "Admin",
    };
    setPaymentHistorys((p) => {
      return [...p, newPayment];
    });
  };
  {
    /*
    item.loaiThaoTac == 2 ? (
              <>
                <FaMoneyCheckDollar
                  color="#ffd500"
                  size={"40px"}
                  style={{ marginBottom: "5px" }}
                />
                <span className="ms-4">{item.thaoTac}</span>
              </>
            ) : */
  }
  const columnsTableOrderHistories = [
    {
      width: "10%",
      dataIndex: "loaiThaoTac",
      render: (text, item) => (
        <div className="ms-5">
          <span className="text-center" style={{ fontWeight: "" }}>
            {item.loaiThaoTac == 0 ? (
              <>
                <FaRegFileAlt
                  color="#09a129"
                  size={"40px"}
                  style={{ marginBottom: "5px" }}
                />
                <span className="ms-4">{item.thaoTac}</span>
              </>
            ) : item.loaiThaoTac == 1 ? (
              <>
                <FaMoneyCheckDollar
                  color="#09a129"
                  size={"40px"}
                  style={{ marginBottom: "5px" }}
                />
                <span className="ms-4">{item.thaoTac}</span>
              </>
            ) : item.loaiThaoTac == 3 ? (
              <>
                <FaTruck
                  color="#09a129"
                  size={"40px"}
                  style={{ marginBottom: "5px" }}
                />
                <span className="ms-4">{item.thaoTac}</span>
              </>
            ) : item.loaiThaoTac == 4 ? (
              <>
                <FaRegCalendarCheck
                  color="#09a129"
                  size={"40px"}
                  style={{ marginBottom: "5px" }}
                />
                <span className="ms-4">{item.thaoTac}</span>
              </>
            ) : item.loaiThaoTac == 5 ? (
              <>
                <FaRegCalendarTimes
                  color="#e5383b"
                  size={"40px"}
                  style={{ marginBottom: "5px" }}
                />
                <span className="ms-4">{item.thaoTac}</span>
              </>
            ) : item.loaiThaoTac == 6 ? (
              <>
                <FaRegCalendarCheck
                  color="#09a129"
                  size={"40px"}
                  style={{ marginBottom: "5px" }}
                />
                <span className="ms-4">{item.thaoTac}</span>
              </>
            ) : item.loaiThaoTac == 7 ? (
              <>
                <FaArrowsRotate
                  color="#e5383b"
                  size={"40px"}
                  style={{ marginBottom: "5px" }}
                />
                <span className="ms-4">{item.thaoTac}</span>
              </>
            ) : item.loaiThaoTac == 8 ? (
              <>
                <FaArrowRotateLeft
                  color="#e5383b"
                  size={"40px"}
                  style={{ marginBottom: "5px" }}
                />
                <span className="ms-4">{item.thaoTac}</span>
              </>
            ) : item.loaiThaoTac == 9 ? (
              <>
                <div className="d-flex" style={{ marginBottom: "5px" }}>
                  <div
                    className=""
                    style={{
                      backgroundColor: "#ffd500",
                      width: "40px",
                      height: "35px",
                      borderRadius: "5px",
                      position: "relative",
                    }}
                  >
                    <div
                      style={{ position: "absolute", left: "9px", top: "4px" }}
                    >
                      <FaPencilAlt color="#ffffff" size={"22px"} />
                    </div>
                  </div>
                  <span style={{ marginTop: "5px" }} className="ms-4">
                    {item.thaoTac}
                  </span>
                </div>
              </>
            ) : (
              ""
            )}
          </span>
        </div>
      ),
    },
    {
      title: "Thời Gian",
      align: "center",
      width: "15%",
      dataIndex: "createdAt",
      render: (text, record) => (
        <span style={{ fontWeight: "normal" }}>
          {format(new Date(record.createdAt), "HH:mm:ss - dd/MM/yyyy")}
        </span>
      ),
    },
    {
      title: "Người Xác Nhận",
      align: "center",
      width: "25%",
      render: (text, record) => (
        <span
          style={{ fontWeight: "500", cursor: "pointer" }}
          className="underline-custom"
        >
          {customers.find((item) => item.id === record.createdBy)?.hoVaTen}
        </span>
      ),
    },
    {
      title: "Ghi Chú",
      align: "center",
      width: "65%",
      dataIndex: "moTa",
      render: (text, record) => (
        <span style={{ fontWeight: "400", whiteSpace: "pre-line" }}>
          {record.moTa}
        </span>
      ),
    },
  ];
  const columns = [
    {
      title: "Số Tiền",
      align: "center",
      dataIndex: "soTienThanhToan",
      width: "15%",
      render: (text, record) => (
        <span className="txt-danger" style={{ fontSize: "17px" }}>
          {record &&
            record.soTienThanhToan &&
            record.soTienThanhToan.toLocaleString("vi-VN", {
              style: "currency",
              currency: "VND",
            })}
        </span>
      ),
    },
    {
      title: "Loại Giao Dịch",
      align: "center",
      dataIndex: "loaiThanhToan",
      width: "10%",
      render: (type) =>
        type == 1 ? (
          <div
            className="rounded-pill mx-auto badge-danger"
            style={{
              height: "35px",
              width: "120px",
              padding: "4px",
            }}
          >
            <span
              className="text-white"
              style={{ fontSize: "14px", fontWeight: "400" }}
            >
              Hoàn tiền
            </span>
          </div>
        ) : type == 0 ? (
          <div
            className="rounded-pill badge-primary mx-auto"
            style={{ height: "35px", width: "120px", padding: "4px" }}
          >
            <span
              className="text-white"
              style={{ fontSize: "14px", fontWeight: "400" }}
            >
              Thanh toán
            </span>
          </div>
        ) : (
          ""
        ),
    },
    {
      title: "Phương Thức Thanh Toán",
      align: "center",
      width: "10%",
      dataIndex: "hinhThucThanhToan",
      render: (text, record) =>
        record.hinhThucThanhToan === 0 || record.hinhThucThanhToan === 2 ? (
          <div
            className="rounded-pill mx-auto badge-success"
            style={{
              height: "35px",
              width: "130px",
              padding: "4px",
            }}
          >
            <span
              className="text-white"
              style={{ fontSize: "14px", fontWeight: "400" }}
            >
              Chuyển khoản
            </span>
          </div>
        ) : record.hinhThucThanhToan == 1 ? (
          <div
            className="rounded-pill badge-success mx-auto"
            style={{ height: "35px", width: "120px", padding: "4px" }}
          >
            <span
              className="text-white"
              style={{ fontSize: "14px", fontWeight: "400" }}
            >
              Tiền mặt
            </span>
          </div>
        ) : (
          ""
        ),
    },
    {
      title: "Trạng Thái",
      align: "center",
      width: "10%",
      dataIndex: "trangThai",
      render: (status) =>
        status == 1 ? (
          <div
            className="rounded-pill badge-primary mx-auto"
            style={{
              height: "35px",
              width: "130px",
              padding: "4px",
            }}
          >
            <span
              className="text-white"
              style={{ fontSize: "14px", fontWeight: "400" }}
            >
              Thành công
            </span>
          </div>
        ) : (
          ""
        ),
    },
    {
      title: "Thời Gian",
      align: "center",
      width: "10%",
      dataIndex: "createdAt",
      render: (text, record) => (
        <span style={{ fontWeight: "normal", whiteSpace: "pre-line" }}>
          {format(new Date(record.createdAt), "HH:mm:ss, dd/MM/yyyy")}
        </span>
      ),
    },
    {
      title: "Mã Giao Dịch",
      align: "center",
      width: "15%",
      dataIndex: "ma",
      render: (text, record) => (
        <span style={{ fontWeight: "500" }}>
          {record.hinhThucThanhToan === 0 ? record.ma : "..."}
        </span>
      ),
    },
    {
      title: "Ghi chú",
      align: "center",
      width: "15%",
      dataIndex: "ghiChu",
    },
    {
      title: "Người Xác Nhận",
      align: "center",
      width: "15%",
      render: (text, record) => (
        <span
          style={{ fontWeight: "500", cursor: "pointer" }}
          className="underline-custom"
        >
          {customers.find((item) => item.id === record.createdBy)?.hoVaTen}
        </span>
      ),
    },
  ];
  const EmptyData = () => {
    return (
      <>
        <div className="text-center" style={{ height: "50px" }}>
          <p className="mt-4" style={{ fontSize: "20px" }}>
            Chưa có dữ liệu!
          </p>
        </div>
      </>
    );
  };

  const [openDialogUpdateRecipientOrder, setOpenDialogUpdateRecipientOrder] =
    useState(false);
  const [openCommon, setOpenCommon] = useState(false);
  const [openDialogPayment, setOpenDialogPayment] = useState(false);
  const [openDialogDetailOrderHistories, setOpenDialogDetailOrderHistories] =
    useState(false);

  const handleCloseNoActionCommon = () => {
    setOpenCommon(false);
  };

  const handleClickOpenDialogPayment = () => {
    setOpenDialogPayment(true);
  };

  const handleCloseDialogPayment = () => {
    handleAddPayment();
    setOpenDialogPayment(false);
  };

  const handleClickOpenDialogDetailOrderHistories = () => {
    setOpenDialogDetailOrderHistories(true);
  };

  const handleCloseDialogDetailOrderHistories = () => {
    setOpenDialogDetailOrderHistories(false);
  };

  const handleConfirmOrderCancel = (description) => {
    const data = {
      trangThai: OrderStatusString.CANCELLED,
      orderHistory: {
        createdAt: new Date(),
        createdBy: userId,
        thaoTac: "Đã Hủy Đơn",
        loaiThaoTac: 5,
        moTa: description || "",
        hoaDon: {
          id: order.id,
        },
      },
    };
    updateStatusOrderDelivery(data);
  };
  const handleConfirmOrderFinish = (description) => {
    const data = {
      trangThai: OrderStatusString.SUCCESS_DELIVERY,
      orderHistory: {
        createdAt: new Date(),
        createdBy: userId,
        thaoTac: "Giao Hàng Thành Công",
        loaiThaoTac: 4,
        moTa: description || "",
        hoaDon: {
          id: order.id,
        },
      },
    };
    updateStatusOrderDelivery(data);
  };
  const handleConfirmDelivery = (description) => {
    const data = {
      trangThai: OrderStatusString.DELIVERING,
      orderHistory: {
        createdAt: new Date(),
        createdBy: userId,
        thaoTac: "Đã Giao Hàng Cho Bên Vận Chuyển",
        loaiThaoTac: 3,
        moTa: description,
        hoaDon: {
          id: order.id,
        },
      },
    };
    updateStatusOrderDelivery(data);
  };

  const handleConfirmOrderInfo = (description) => {
    const data = {
      trangThai: OrderStatusString.CONFIRMED,
      orderHistory: {
        createdAt: new Date(),
        createdBy: userId,
        thaoTac: "Chờ Giao Hàng",
        loaiThaoTac: 1,
        moTa: description,
        hoaDon: {
          id: order.id,
        },
      },
    };
    updateStatusOrderDelivery(data);
  };
  const handleOpenDialogConfirmOrder = (status, isCancel) => {
    if (isCancel) {
      setStatus(OrderStatusString.CANCELLED);
      setOpenCommon(true);
    } else {
      setStatus(status);
      setOpenCommon(true);
    }
  };
  const handleClickOpenDialogUpdateRecipientOrder = () => {
    setOpenDialogUpdateRecipientOrder(true);
  };

  const handleCloseDialogUpdateRecipientOrder = () => {
    setOpenDialogUpdateRecipientOrder(false);
  };
  const handleCloseNoActionDialogUpdateRecipientOrder = () => {
    setOpenDialogUpdateRecipientOrder(false);
  };
  const handleCloseNoActionDialogPayment = () => {
    setOpenDialogPayment(false);
  };

  const [openRollback, setOpenRollback] = useState(false);

  const handleCloseOpenRollback = () => {
    setOpenRollback(false);
  };

  const TimeLine = () => {
    return (
      <div className="time-line">
        <Timeline
          minEvents={orderHistories && 5 + orderHistories.length}
          placeholder
        >
          {orderHistories &&
            orderHistories.map((item, index) => (
              <TimelineEvent
                icon={
                  item.loaiThaoTac == 0
                    ? FaRegFileAlt
                    : item.loaiThaoTac == 1
                      ? FaMoneyCheckDollar
                      : item.loaiThaoTac == 3
                        ? FaTruck
                        : item.loaiThaoTac == 4
                          ? FaRegCalendarCheck
                          : item.loaiThaoTac == 5
                            ? FaRegCalendarTimes
                            : item.loaiThaoTac == 6
                              ? FaRegCalendarCheck
                              : item.loaiThaoTac == 7
                                ? FaArrowsRotate
                                : item.loaiThaoTac == 8
                                  ? FaArrowRotateLeft
                                  : item.loaiThaoTac == 9
                                    ? FaPencilAlt
                                    : ""
                }
                title={
                  <div className="mt-1">
                    <span style={{ whiteSpace: "pre-line", fontSize: "19px" }}>
                      {item.thaoTac}
                    </span>
                  </div>
                }
                subtitle={format(
                  new Date(item.createdAt),
                  "HH:mm:ss - dd/MM/yyyy"
                )}
                color={
                  item.loaiThaoTac == 0
                    ? "#09a129"
                    : item.loaiThaoTac == 1
                      ? "#09a129"
                      : item.loaiThaoTac == 3
                        ? "#09a129"
                        : item.loaiThaoTac == 4
                          ? "#09a129"
                          : item.loaiThaoTac == 5
                            ? "#e5383b"
                            : item.loaiThaoTac == 6
                              ? "#09a129"
                              : item.loaiThaoTac == 7
                                ? "#e5383b"
                                : item.loaiThaoTac == 8
                                  ? "#e5383b"
                                  : item.loaiThaoTac == 9
                                    ? "#ffd500"
                                    : ""
                }
              />
            ))}
        </Timeline>
      </div>
    );
  };
  const divRef1 = useRef(null);
  const scrollToDiv1 = () => {
    const { top, height } = divRef1.current.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const offset = top + scrollTop - (window.innerHeight - height) / 2;

    window.scrollTo({
      top: offset,
      behavior: "smooth",
    });
  };

  const ProcessOrder = () => {
    return (
      <div className="d-flex justify-content-between mt-2 p-3">
        <div className="d-flex order-info">
          {order.trangThai == OrderStatusString.PENDING_CONFIRM &&
            order.loaiHoaDon == OrderTypeString.DELIVERY ? (
            <div>
              <Button
                onClick={() => {
                  if (checkImeisDaBan()) {
                    scrollToDiv1();
                    return;
                  } else {
                    handleOpenDialogConfirmOrder(
                      OrderStatusString.PENDING_CONFIRM,
                      false
                    );
                  }
                }}
                className="rounded-2 ms-2"
                type="primary"
                style={{
                  height: "40px",
                  width: "auto",
                  fontSize: "16px",
                }}
              >
                <span
                  className=""
                  style={{ fontWeight: "500", marginBottom: "2px" }}
                >
                  XÁC NHẬN
                </span>
              </Button>
            </div>
          ) : null}
          {order.trangThai === OrderStatusString.CONFIRMED &&
            order.loaiHoaDon === OrderTypeString.DELIVERY ? (
            <div>
              <Button
                onClick={() =>
                  handleOpenDialogConfirmOrder(
                    OrderStatusString.CONFIRMED,
                    false
                  )
                }
                className="rounded-2 ms-2"
                type="primary"
                style={{
                  height: "40px",
                  width: "auto",
                  fontSize: "16px",
                }}
              >
                <span
                  className=""
                  style={{ fontWeight: "500", marginBottom: "2px" }}
                >
                  GIAO HÀNG
                </span>
              </Button>
            </div>
          ) : null}
          {
            order.trangThai == OrderStatusString.DELIVERING &&
              order.loaiHoaDon == OrderTypeString.DELIVERY ? (
              <div>
                <Button
                  onClick={() =>
                    handleOpenDialogConfirmOrder(
                      OrderStatusString.DELIVERING,
                      false
                    )
                  }
                  className="rounded-2 ms-2"
                  type="primary"
                  style={{
                    height: "40px",
                    width: "auto",
                    fontSize: "16px",
                  }}
                >
                  <span
                    className=""
                    style={{ fontWeight: "500", marginBottom: "2px" }}
                  >
                    HOÀN THÀNH ĐƠN
                  </span>
                </Button>
              </div>
            ) : (
              ""
            )}
          {(order.trangThai === OrderStatusString.CONFIRMED ||
            order.trangThai === OrderStatusString.DELIVERING) &&
            order.loaiHoaDon === OrderTypeString.DELIVERY ? (
            <div>
              <Button
                onClick={() => {
                  setOpenRollback(true);
                }}
                className="rounded-2 ms-2"
                type="primary"
                style={{
                  height: "40px",
                  width: "auto",
                  fontSize: "16px",
                }}
              >
                <span
                  className=""
                  style={{ fontWeight: "500", marginBottom: "2px" }}
                >
                  HOÀN TÁC
                </span>
              </Button>
            </div>
          ) : null}
          {paymentHistorys &&
            paymentHistorys.length <= 0 &&
            order.trangThai != OrderStatusString.CANCELLED &&
            order.trangThai != OrderStatusString.SUCCESS_DELIVERY &&
            order.loaiHoaDon == OrderTypeString.DELIVERY ? (
            <div className="">
              <Button
                onClick={() => handleOpenDialogConfirmOrder(null, true)}
                danger
                className="rounded-2 ms-2"
                type="danger"
                style={{
                  height: "40px",
                  width: "auto",
                  fontSize: "16px",
                }}
              >
                <span
                  className=""
                  style={{ fontWeight: "500", marginBottom: "2px" }}
                >
                  HỦY ĐƠN
                </span>
              </Button>
            </div>
          ) : (
            ""
          )}
        </div>
        <div className="d-flex">
          {(!checkImeisDaBan()) && <Print data={order} />}

          {(order.loaiHoaDon === OrderTypeString.DELIVERY || order.loaiHoaDon === OrderTypeString.CLIENT) &&
            (
              <>
                <PrintDelivery data={order} />
              </>
            )}
          <Button
            onClick={handleClickOpenDialogDetailOrderHistories}
            className="rounded-2"
            type="warning"
            style={{
              height: "40px",
              width: "100px",
              fontSize: "16px",
            }}
          >
            <span
              className="text-dark"
              style={{ fontWeight: "500", marginBottom: "2px" }}
            >
              Chi Tiết
            </span>
          </Button>
        </div>
      </div>
    );
  };

  const OrderInfo = () => {
    return (
      <div
        className="wrap-order-detail mt-4"
        style={{
          height:
            order.loaiHoaDon === OrderTypeString.AT_COUNTER
              ? "340px"
              : /* "480px" */ "340px",
        }}
      >
        <div className="p-3">
          <div className="d-flex justify-content-between">
            <div className="ms-2" style={{ marginTop: "3px" }}>
              <span className="" style={{ fontSize: "25px" }}>
                THÔNG TIN ĐƠN HÀNG
              </span>
            </div>
            <div className="">
              {order.trangThai === OrderStatusString.PENDING_CONFIRM ||
                order.trangThai === OrderStatusString.CONFIRMED ? (
                <Button
                  onClick={handleClickOpenDialogUpdateRecipientOrder}
                  className="rounded-2 ms-2"
                  type="primary"
                  style={{
                    height: "40px",
                    fontSize: "16px",
                    width: "100px",
                  }}
                >
                  <span
                    className=""
                    style={{ fontWeight: "500", marginBottom: "2px" }}
                  >
                    Cập nhật
                  </span>
                </Button>
              ) : null}
            </div>
          </div>
          <div
            className="ms-2 mt-2"
            style={{
              borderBottom: "2px solid #C7C7C7",
              width: "99.2%",
              borderWidth: "2px",
            }}
          ></div>
        </div>

        <Row>
          <Col sm="5">
            <div className="ms-4 mt-3 d-flex" style={{ height: "30px" }}>
              <div className="ms-2 mt-1" style={{ width: "140px" }}>
                <span className="" style={{ fontSize: "17px" }}>
                  Mã Đơn Hàng
                </span>
              </div>
              <div className="ms-5 ps-5">
                <div
                  className="rounded-pill text-center"
                  style={{
                    height: "35px",
                    width: "140px",
                    padding: "5px",
                    backgroundColor: "#e1e1e1",
                  }}
                >
                  <span className="text-dark p-2" style={{ fontSize: "14px" }}>
                    {order.ma}
                  </span>
                </div>
              </div>
            </div>
            <div className="ms-4 mt-4 d-flex" style={{ height: "30px" }}>
              <div className="ms-2 mt-1" style={{ width: "140px" }}>
                <span style={{ fontSize: "17px" }}>Loại Đơn Hàng</span>
              </div>
              <div className="ms-5 ps-5">
                {(order.loaiHoaDon === OrderTypeString.CLIENT || order.loaiHoaDon == OrderTypeString.DELIVERY) ? (
                  <div
                    className="rounded-pill badge-success text-center"
                    style={{
                      height: "35px",
                      width: "100px",
                      padding: "5px",
                    }}
                  >
                    <span
                      className="text-white p-2"
                      style={{ fontSize: "14px" }}
                    >
                      Giao hàng
                    </span>
                  </div>
                ) : (
                  <div
                    className="rounded-pill bg-primary text-center"
                    style={{
                      height: "35px",
                      width: "90px",
                      padding: "5px",
                    }}
                  >
                    <span
                      className="text-white p-2"
                      style={{ fontSize: "14px" }}
                    >
                      Tại quầy
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div className="ms-4 mt-4 d-flex" style={{ height: "30px" }}>
              <div className="ms-2 mt-1" style={{ width: "140px" }}>
                <span style={{ fontSize: "17px" }}>Trạng Thái</span>
              </div>
              <div className="ms-5 ps-5">
                {order.trangThai == OrderStatusString.PENDING_CONFIRM ? (
                  <div
                    className="rounded-pill badge-warning text-center"
                    style={{
                      height: "35px",
                      width: "125px",
                      padding: "5px",
                    }}
                  >
                    <span
                      className="text-dark p-2"
                      style={{ fontSize: "14px" }}
                    >
                      Chờ xác nhận
                    </span>
                  </div>
                ) : order.trangThai == OrderStatusString.CONFIRMED ? (
                  <div
                    className="rounded-pill badge-success text-center"
                    style={{
                      height: "35px",
                      width: "128px",
                      padding: "5px",
                    }}
                  >
                    <span
                      className="text-white p-2"
                      style={{ fontSize: "14px" }}
                    >
                      Chờ giao hàng
                    </span>
                  </div>
                ) : order.trangThai == OrderStatusString.DELIVERING ? (
                  <div
                    className="rounded-pill badge-primary text-center"
                    style={{
                      height: "35px",
                      width: "135px",
                      padding: "5px",
                    }}
                  >
                    <span
                      className="text-white p-2"
                      style={{ fontSize: "14px" }}
                    >
                      Đang giao hàng
                    </span>
                  </div>
                ) : order.trangThai == OrderStatusString.SUCCESS_DELIVERY ? (
                  <div
                    className="rounded-pill badge-primary text-center"
                    style={{
                      height: "35px",
                      width: "110px",
                      padding: "5px",
                    }}
                  >
                    <span
                      className="text-white p-2"
                      style={{ fontSize: "14px" }}
                    >
                      Hoàn thành
                    </span>
                  </div>
                ) : order.trangThai == OrderStatusString.REFUND_FULL ? (
                  <div
                    className="rounded-pill badge-danger text-center"
                    style={{
                      height: "35px",
                      width: "160px",
                      padding: "5px",
                    }}
                  >
                    <span
                      className="text-white p-2"
                      style={{ fontSize: "14px" }}
                    >
                      Hoàn trả toàn phần
                    </span>
                  </div>
                ) : order.trangThai == OrderStatusString.REFUND_A_PART ? (
                  <div
                    className="rounded-pill badge-danger text-center"
                    style={{
                      height: "35px",
                      width: "140px",
                      padding: "5px",
                    }}
                  >
                    <span
                      className="text-white p-2"
                      style={{ fontSize: "14px" }}
                    >
                      Hoàn trả 1 phần
                    </span>
                  </div>
                ) : order.trangThai == OrderStatusString.CANCELLED ? (
                  <div
                    className="rounded-pill badge-danger text-center"
                    style={{
                      height: "35px",
                      width: "80px",
                      padding: "5px",
                    }}
                  >
                    <span
                      className="text-white p-2"
                      style={{ fontSize: "14px" }}
                    >
                      Đã hủy
                    </span>
                  </div>
                ) : order.trangThai == OrderStatusString.HAD_PAID ? (
                  <div
                    className="rounded-pill bg-primary text-center"
                    style={{
                      height: "35px",
                      width: "110px",
                      padding: "5px",
                    }}
                  >
                    <span
                      className="text-white p-2"
                      style={{ fontSize: "14px" }}
                    >
                      Hoàn thành
                    </span>
                  </div>
                ) : (
                  ""
                )}
              </div>
            </div>
            <div className="ms-4 mt-4 d-flex" style={{ height: "30px" }}>
              <div className="ms-2 mt-1" style={{ width: "140px" }}>
                <span style={{ fontSize: "17px" }}>
                  {order.loaiHoaDon === OrderTypeString.AT_COUNTER
                    ? "Ngày Tạo"
                    : "Ngày Đặt Hàng"}
                </span>
              </div>
              <div className="ms-5 ps-5">
                <div
                  className="rounded-pill text-center"
                  style={{
                    height: "35px",
                    width: "180px",
                    padding: "5px",
                    backgroundColor: "#e1e1e1",
                  }}
                >
                  <span className="text-dark p-2" style={{ fontSize: "14px" }}>
                    {order &&
                      order.createdAt &&
                      format(
                        new Date(order.createdAt),
                        "dd/MM/yyyy - HH:mm:ss"
                      )}
                  </span>
                </div>
              </div>
            </div>
            {/*order.loaiHoaDon === OrderTypeString.DELIVERY ?
              <div className="ms-4 mt-4 d-flex" style={{ height: "30px" }}>
                <div className="ms-2 mt-1" style={{ width: "140px" }}>
                  <span style={{ fontSize: "17px" }}>
                    Ngày Thanh Toán</span>
                </div>
                <div className="ms-5 ps-5">
                  <div
                    className="rounded-pill"
                    style={{
                      height: "35px",
                      width: "auto",
                      padding: "5px",
                      backgroundColor: "#e1e1e1",
                    }}
                  >
                    <span className="text-dark p-2" style={{ fontSize: "14px" }}>
                      {order &&
                        order.createdAt &&
                        format(
                          new Date(order.createdAt),
                          "dd/MM/yyyy - HH:mm:ss"
                        )}
                    </span>
                  </div>
                </div>
              </div>
              : ""*/}
            {/*order.loaiHoaDon === OrderTypeString.DELIVERY ?
              <div className="ms-4 mt-4 d-flex" style={{ height: "30px" }}>
                <div className="ms-2 mt-1" style={{ width: "140px" }}>
                  <span style={{ fontSize: "17px" }}>
                    Ngày giao hàng cho bên vận chuyển</span>
                </div>
                <div className="ms-5 ps-5">
                  <div
                    className="rounded-pill"
                    style={{
                      height: "35px",
                      width: "auto",
                      padding: "5px",
                      backgroundColor: "#e1e1e1",
                    }}
                  >
                    <span className="text-dark p-2" style={{ fontSize: "14px" }}>
                      {order &&
                        order.createdAt &&
                        format(
                          new Date(order.createdAt),
                          "dd/MM/yyyy - HH:mm:ss"
                        )}
                    </span>
                  </div>
                </div>
              </div>
              : ""*/}
          </Col>
          <Col sm="6" className="ms-5">
            <div className="ms-4 mt-3 d-flex" style={{ height: "30px" }}>
              <div className="ms-2 mt-1" style={{ width: "140px" }}>
                <span style={{ fontSize: "17px" }}>
                  {order.loaiHoaDon === OrderTypeString.DELIVERY
                    ? "Tên Người Nhận"
                    : "Tên Khách Hàng"}
                </span>
              </div>
              <div className="ms-5 ps-5">
                {order.loaiHoaDon === OrderTypeString.AT_COUNTER &&
                  order.account === null
                  ? order.hoVaTen
                  : order.loaiHoaDon === OrderTypeString.AT_COUNTER &&
                    order.account &&
                    order.account.hoVaTen
                    ? order.account.hoVaTen
                    : order.tenNguoiNhan}
              </div>
            </div>
            <div className="ms-4 mt-4 mt-1 d-flex" style={{ height: "30px" }}>
              <div className="ms-2 mt-1" style={{ width: "140px" }}>
                <span style={{ fontSize: "17px" }}>Số Điện Thoại</span>
              </div>
              <div className="ms-5 ps-5 mt-1">
                <span className="text-dark" style={{ fontSize: "17px" }}>
                  {order.loaiHoaDon === OrderTypeString.AT_COUNTER &&
                    order.account === null
                    ? order.soDienThoai
                    : order.loaiHoaDon === OrderTypeString.AT_COUNTER &&
                      order.account &&
                      order.account.soDienThoai
                      ? order.account.soDienThoai
                      : order.soDienThoaiNguoiNhan}
                </span>
              </div>
            </div>
            <div className="ms-4 mt-4 mt-1 d-flex" style={{ height: "30px" }}>
              <div className="ms-2 mt-1" style={{ width: "140px" }}>
                <span style={{ fontSize: "17px" }}>Email</span>
              </div>
              <div className="ms-5 ps-5 mt-1">
                <span className="text-dark" style={{ fontSize: "17px" }}>
                  {order.account === null
                    ? order.email
                    : order.account && order.account.email
                      ? order.account.email
                      : "..."}
                </span>
              </div>
            </div>
            <div className="ms-4 mt-4 mt-1 d-flex" style={{ height: "30px" }}>
              <div className="ms-2 mt-1" style={{ width: "140px" }}>
                <span style={{ fontSize: "17px" }}>
                  Địa Chỉ{" "}
                  {order.loaiHoaDon === OrderTypeString.AT_COUNTER
                    ? ""
                    : " Nhận"}
                </span>
              </div>
              <div
                className="ms-5 ps-5 mt-1"
                style={{ whiteSpace: "pre-line", flex: "1" }}
              >
                <span className="text-dark" style={{ fontSize: "17px" }}>
                  {order.loaiHoaDon === OrderTypeString.AT_COUNTER &&
                    order.account === null
                    ? "..."
                    : order.loaiHoaDon === OrderTypeString.AT_COUNTER &&
                      order.account &&
                      order.account.diaChiList
                      ? addressDefault
                      : order.diaChiNguoiNhan +
                      ", " +
                      order.xaPhuongNguoiNhan +
                      ", " +
                      order.quanHuyenNguoiNhan +
                      ", " +
                      order.tinhThanhPhoNguoiNhan}
                </span>
              </div>
            </div>
            {/*order.loaiHoaDon === OrderTypeString.DELIVERY ?
              <div className="ms-4 mt-4 mt-1 d-flex" style={{ height: "30px" }}>
                <div className="ms-2 mt-1" style={{ width: "140px" }}>
                  <span style={{ fontSize: "17px" }}>Ghi Chú Shipper</span>
                </div>
                <div
                  className="ms-5 ps-5 mt-1"
                  style={{ whiteSpace: "pre-line", flex: "1" }}
                >
                  <span className="text-dark ms-1" style={{ fontSize: "17px" }}>
                    {order.diaChiNguoiNhan == null ? "..." : order.diaChiNguoiNhan}
                  </span>
                </div>
              </div>
              : ""*/}
            {/*order.loaiHoaDon === OrderTypeString.DELIVERY ?
              <div className="ms-4 mt-4 d-flex" style={{ height: "30px" }}>
                <div className="ms-2 mt-1" style={{ width: "140px" }}>
                  <span style={{ fontSize: "17px" }}>
                    Ngày hoàn thành đơn</span>
                </div>
                <div className="ms-5 ps-5">
                  <div
                    className="rounded-pill"
                    style={{
                      height: "35px",
                      width: "auto",
                      padding: "5px",
                      backgroundColor: "#e1e1e1",
                    }}
                  >
                    <span className="text-dark p-2" style={{ fontSize: "14px" }}>
                      {order &&
                        order.createdAt &&
                        format(
                          new Date(order.createdAt),
                          "dd/MM/yyyy - HH:mm:ss"
                        )}
                    </span>
                  </div>
                </div>
              </div>
              : ""*/}
          </Col>
        </Row>
      </div>
    );
  };

  const PaymentHistories = () => {
    return (
      <div className="wrap-payment mt-4 p-3">
        <div className="">
          <div className="d-flex justify-content-between">
            <div className="ms-2" style={{ marginTop: "3px" }}>
              <span className="" style={{ fontSize: "25px" }}>
                LỊCH SỬ THANH TOÁN
              </span>
            </div>
            <div className="">
              {order.loaiHoaDon === OrderTypeString.DELIVERY &&
                (
                  (order.trangThai === OrderStatusString.CONFIRMED ||
                    order.trangThai === OrderStatusString.DELIVERING) &&
                  order.tienKhachTra < order.khachCanTra) ? (
                <Button
                  onClick={() => setOpenPayment(true)}
                  className="rounded-2 ms-2"
                  type="primary"
                  style={{
                    height: "40px",
                    fontSize: "16px",
                    width: "180px",
                  }}
                >
                  <span
                    className=""
                    style={{ fontWeight: "500", marginBottom: "2px" }}
                  >
                    Tiến hành thanh toán
                  </span>
                </Button>
              ) : null}
            </div>
          </div>
          <div
            className="ms-2 mt-2"
            style={{
              borderBottom: "2px solid #C7C7C7",
              width: "99.2%",
              borderWidth: "2px",
            }}
          ></div>
        </div>
        <div className="mt-3">
          <Table
            className="scroll-container1"
            columns={columns}
            dataSource={paymentHistorys}
            pagination={false}
            rowKey={"id"}
            key={"id"}
            locale={{ emptyText: <Empty /> }}
          />
          {/*
              <div className="d-flex justify-content-between p-3">
                <div className="ms-1 mt-2">
                  <div className="" style={{ marginTop: "1px" }}>
                    <span className="ms-2" style={{ fontSize: "16px" }}>
                      Đã Thanh Toán Tổng Cộng
                    </span>
                    <span
                      className="ms-4"
                      style={{
                        fontSize: "16px",
                        color: "#dc1111",
                        fontWeight: "550",
                      }}
                    >
                      {soTienThanhToan.toLocaleString("vi-VN", {
                        style: "currency",
                        currency: "VND",
                      })}
                    </span>
                  </div>
                </div>
                <div className="">
                  <div
                    className="rounded-pill bg-primary me-2"
                    style={{ height: "38px", width: "auto", padding: "10px" }}
                  >
                    <span
                      className="text-white p-1"
                      style={{ fontSize: "14px" }}
                    >
                      Hoàn tất thanh toán
                    </span>
                  </div>
                </div>
              </div>
*/}
        </div>
      </div>
    );
  };

  const columnsOrderItems = [
    {
      title: "Sản phẩm",
      width: "40%",
      align: "center",
      render: (text, item) => (
        <div className="d-flex">
          <div className="product-img" style={{ position: "relative" }}>
            <img
              src={
                item &&
                item.sanPhamChiTiet &&
                item.sanPhamChiTiet.image &&
                item.sanPhamChiTiet.image.path
              }
              class=""
              alt=""
              style={{ width: "125px", height: "125px" }}
            />
            {item && item.donGiaSauGiam !== null && item.donGiaSauGiam !== 0 ? (
              <div
                className="category"
                style={{
                  userSelect: "none",
                  backgroundColor: "#ffcc00",
                  position: "absolute",
                  top: "0px",
                  borderTopLeftRadius: `8px`,
                  fontSize: "11px",
                  borderTopRightRadius: `20px`,
                  borderBottomRightRadius: `20px`,
                  fontWeight: "600",
                  padding: "4px 8px", // Add padding for better visibility
                  // width: "auto",
                  // height: "30px"
                  marginLeft: "10px",
                  // marginTop: "25px",
                }}
              >
                Giảm{" "}
                {countPrice(item.donGia, item.donGiaSauGiam).toLocaleString(
                  "vi-VN",
                  {
                    style: "currency",
                    currency: "VND",
                  }
                )}
              </div>
            ) : null}
          </div>
          <div className="product ms-3 text-start">
            <Tooltip
              TransitionComponent={Zoom}
              title="Xem sản phẩm"
              style={{ cursor: "pointer" }}
              placement="top-start"
            >
              <div classNamountme="product-name">
                <span
                  className="underline-custom"
                  style={{
                    whiteSpace: "pre-line",
                    fontSize: "17.5px",
                    fontWeight: "500",
                  }}
                >
                  {item.sanPhamChiTiet.sanPham.tenSanPham +
                    "\u00A0" +
                    item.sanPhamChiTiet.ram.dungLuong +
                    "/" +
                    item.sanPhamChiTiet.rom.dungLuong +
                    "GB" +
                    " " +
                    `(${item.sanPhamChiTiet.mauSac.tenMauSac})`}
                </span>
              </div>
            </Tooltip>
            <div className="mt-2">
              <span
                className="txt-price"
                style={{ fontSize: "17.5px", fontWeight: "" }}
              >
                {item && item.donGiaSauGiam !== null && item.donGiaSauGiam !== 0
                  ? item.donGiaSauGiam.toLocaleString("vi-VN", {
                    style: "currency",
                    currency: "VND",
                  })
                  : ""}
              </span>
              <span
                className={
                  item.donGiaSauGiam !== null && item.donGiaSauGiam !== 0
                    ? "txt-price-discount ms-2"
                    : "txt-price"
                }
                style={{ fontSize: "17px", fontWeight: "" }}
              >
                {item && item.donGia
                  ? item.donGia.toLocaleString("vi-VN", {
                    style: "currency",
                    currency: "VND",
                  })
                  : ""}
              </span>
            </div>
            {item.imeisDaBan &&
              item.imeisDaBan.length <= 0 &&
              item.imeisDaBan.length !== item.soLuong && (
                <div className="mt-2 pt-1">
                  <Box sx={{ width: "100%" }}>
                    <Alert color="danger" variant="soft">
                      Bạn cần chọn Imei cho sản phẩm trước khi giao hàng.
                    </Alert>
                  </Box>
                </div>
              )}
          </div>
        </div>
      ),
    },
    {
      title: "Số lượng",
      align: "center",
      dataIndex: "soLuong",
      width: "10%",
      render: (text, item) => (
        <div>
          <span style={{ fontWeight: "", fontSize: "17px" }} className="">
            {"x" + item.soLuong}
          </span>
        </div>
      ),
    },
    {
      title: "Thành tiền",
      align: "center",
      width: "20%",
      render: (text, item) => (
        <div>
          <span
            style={{ fontSize: "17.5px", fontWeight: "" }}
            className="txt-price"
          >
            {(item &&
              totalItem(
                item.soLuong,
                item.donGiaSauGiam !== null && item.donGiaSauGiam !== 0
                  ? item.donGiaSauGiam
                  : item.donGia
              ).toLocaleString("vi-VN", {
                style: "currency",
                currency: "VND",
              })) ||
              0}
          </span>
        </div>
      ),
    },
    {
      title: "Thao tác",
      align: "center",
      dataIndex: "actions",
      width: "15%",
      render: (text, item) => (
        <div>
          <div className="button-container">
            {order.trangThai === OrderStatusString.PENDING_CONFIRM ? (
              <>
                <Button
                  onClick={() => {
                    handleOpenModalUpdateImei();
                    const imeisDaBan = item.imeisDaBan;
                    const imeiAll = item.sanPhamChiTiet.imeis;
                    const isSelected = (item) =>
                      imeisDaBan.some(
                        (selectedItem) => selectedItem.soImei === item.soImei
                      );
                    const sortedItems = [...imeiAll].sort((a, b) => {
                      const isSelectedA = isSelected(a);
                      const isSelectedB = isSelected(b);
                      if (isSelectedA && !isSelectedB) {
                        return -1;
                      } else if (!isSelectedA && isSelectedB) {
                        return 1;
                      }
                      return 0;
                    });
                    setImeis(sortedItems);
                    setProductName(item.sanPhamChiTiet.sanPham.tenSanPham +
                      "\u00A0" +
                      item.sanPhamChiTiet.ram.dungLuong +
                      "/" +
                      item.sanPhamChiTiet.rom.dungLuong +
                      "GB" +
                      " " +
                      `(${item.sanPhamChiTiet.mauSac.tenMauSac})`);
                    setMaxAmount(item.soLuong);
                    setIdOrderItem(item.id);
                    setSelectedImei(item.imeisDaBan);
                    setSelectedImeiRefresh([]);
                    setSize(item.soLuong);
                  }}
                  className="rounded-2 button-mui"
                  type="primary"
                  style={{ height: "38px", width: "100px", fontSize: "15px" }}
                >
                  <span
                    className="text-white"
                    style={{
                      marginBottom: "2px",
                      fontSize: "15px",
                      fontWeight: "500",
                    }}
                  >
                    Cập Nhật
                  </span>
                </Button>
                {orderItems && orderItems.length > 1 && (
                  <Button
                    onClick={() => handleDeleteCartItemOrderById(item.id, item.soLuong, item.sanPhamChiTiet.sanPham.tenSanPham +
                      " " +
                      item.sanPhamChiTiet.ram.dungLuong +
                      "/" +
                      item.sanPhamChiTiet.rom.dungLuong +
                      "GB (" +
                      item.sanPhamChiTiet.mauSac.tenMauSac +
                      ")")}
                    className="rounded-2 button-mui ms-2"
                    type="danger"
                    style={{ height: "38px", width: "80px", fontSize: "15px" }}
                  >
                    <span
                      className="text-white"
                      style={{
                        marginBottom: "2px",
                        fontSize: "15px",
                        fontWeight: "500",
                      }}
                    >
                      Xóa
                    </span>
                  </Button>
                )}
              </>
            ) : (
              <Button
                onClick={() => {
                  setOpenViewImei(true);
                  setViewImeis(item.imeisDaBan);
                }}
                className="rounded-2 ant-btn-light"
                style={{ height: "38px", width: "90px", fontSize: "15px" }}
              >
                <span
                  className=""
                  style={{
                    marginBottom: "2px",
                    fontSize: "15px",
                    fontWeight: "500",
                  }}
                >
                  Chi Tiết
                </span>
              </Button>
            )}
          </div>
        </div>
      ),
    },
  ];

  const OrderSummary = () => {
    return (
      <div className="wrap-order-summary mt-4 p-3">
        <div className="">
          <div className="d-flex justify-content-between">
            <div className="ms-2" style={{ marginTop: "3px" }}>
              <span className="" style={{ fontSize: "25px" }}>
                DANH SÁCH SẢN PHẨM ĐÃ{" "}
                {order.loaiHoaDon === OrderTypeString.AT_COUNTER ? "" : " ĐẶT "}{" "}
                MUA
              </span>
            </div>
            <div className="">
              {order.trangThai === OrderStatusString.PENDING_CONFIRM ? (
                <>
                  <Button
                    onClick={() => {
                      handleOpenScanner();
                      setScannerRef([]);
                    }}
                    className="rounded-2 me-2"
                    type="warning"
                    style={{ height: "38px", width: "120px", fontSize: "15px" }}
                  >
                    <span
                      className=""
                      style={{
                        fontSize: "15px",
                        fontWeight: "500",
                        marginBottom: "2px",
                      }}
                    >
                      Quét Barcode
                    </span>
                  </Button>
                  <Button
                    onClick={() => {
                      setOpenProducts(true);
                      getAllProducts();
                      setIsOpen(true);
                    }}
                    className="rounded-2"
                    type="primary"
                    style={{ height: "40px", width: "145px", fontSize: "16px" }}
                  >
                    <span
                      className="text-white"
                      style={{ marginBottom: "3px", fontWeight: "500" }}
                    >
                      Thêm sản phẩm
                    </span>
                  </Button>
                </>
              ) : null}
            </div>
          </div>
          <div
            className="ms-2 mt-2"
            style={{
              borderBottom: "2px solid #C7C7C7",
              width: "99.2%",
              borderWidth: "2px",
            }}
          ></div>
        </div>

        <div
          className="wrap-cart-order mx-auto"
          style={{ height: "auto", width: "98%" }}
        >
          <Row className="">
            <div className="">
              <div className="mt-2" style={{ height: "auto" }} ref={divRef1}>
                <Table
                  className="table-cart"
                  columns={columnsOrderItems}
                  dataSource={orderItemsSort}
                  pagination={false}
                  rowKey={"id"}
                  key={"id"}
                />
              </div>
            </div>
          </Row>
        </div>

        <div
          className="ms-2 mt-2"
          style={{
            borderBottom: "2px solid #C7C7C7",
            width: "99.2%",
            borderWidth: "2px",
          }}
        ></div>
        <div className="d-flex mt-3">
          <div
            style={{
              // backgroundColor: "whitesmoke",
              height: "auto",
              width: "400px",
            }}
            className="rounded-2 ms-auto wrap-total-money"
          >
            <div className="p-4">
              <div className="d-flex justify-content-between">
                <span className="" style={{ fontSize: "16px", color: "" }}>
                  Tổng số lượng
                  {order.tienTraKhach &&
                    <span
                      className="ms-2"
                      style={{ fontWeight: "500", color: "#2f80ed" }}
                    >
                      {`(Hoàn trả) `}
                      <span
                        className="text-dark"
                        style={{ fontSize: "17px", fontWeight: "500" }}
                      >
                        {orderImeis.filter((item) => item.trangThai === StatusImei.REFUND).length}
                      </span>
                    </span>
                  }
                </span>
                <span
                  className="text-dark"
                  style={{ fontSize: "17px", fontWeight: "500" }}
                >
                  {order.tienTraKhach &&
                    <span
                      className="ms-2"
                      style={{ fontWeight: "500", color: "#2f80ed" }}
                    >
                      {`(Tổng) `}
                    </span>
                  }
                  <span
                    className="text-dark"
                    style={{ fontSize: "17px", fontWeight: "500" }}
                  >
                    {totalAmountProduct()}
                  </span>
                </span>
              </div>
              <div className="d-flex justify-content-between mt-3">
                <span className="" style={{ fontSize: "16px", color: "" }}>
                  Tổng tiền hàng
                </span>
                <span
                  className="text-dark"
                  style={{ fontSize: "17px", fontWeight: "500" }}
                >
                  {order &&
                    order.tongTien &&
                    order.tongTien.toLocaleString("vi-VN", {
                      style: "currency",
                      currency: "VND",
                    })}
                </span>
              </div>
              <div className="d-flex justify-content-between mt-3">
                <span className="" style={{ fontSize: "16px", color: "" }}>
                  Phiếu giảm giá
                </span>
                <span
                  className="text-dark"
                  style={{ fontSize: "17px", fontWeight: "500" }}
                >
                  <span
                    className="underline-custom"
                    style={{ cursor: "pointer", fontWeight: "500" }}
                  >
                    {(order &&
                      order.voucher &&
                      order.voucher.ma &&
                      "(" + order.voucher.ma + ") ") ||
                      ""}
                  </span>
                  {totalDiscount(
                    order && order.tongTien && order.tongTien,
                    order &&
                    order.tongTienSauKhiGiam &&
                    order.tongTienSauKhiGiam
                  ).toLocaleString("vi-VN", {
                    style: "currency",
                    currency: "VND",
                  }) || 0}
                </span>
              </div>
              {order.loaiHoaDon === OrderTypeString.AT_COUNTER ? (
                <>
                  <div className="d-flex justify-content-between mt-3">
                    <span className="" style={{ fontSize: "16px", color: "" }}>
                      Khách cần trả
                    </span>
                    <span
                      className="text-dark"
                      style={{ fontSize: "17px", fontWeight: "500" }}
                    >
                      {order &&
                        order.khachCanTra &&
                        order.khachCanTra.toLocaleString("vi-VN", {
                          style: "currency",
                          currency: "VND",
                        }) || 0}
                    </span>
                  </div>
                  <div className="d-flex justify-content-between mt-3">
                    <span className="" style={{ fontSize: "16px" }}>
                      Khách đã trả
                    </span>
                    <span
                      className="text-dark"
                      style={{ fontSize: "17px", fontWeight: "500" }}
                    >
                      {(order &&
                        order.tienKhachTra &&
                        order.tienKhachTra.toLocaleString("vi-VN", {
                          style: "currency",
                          currency: "VND",
                        })) ||
                        0}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="d-flex justify-content-between mt-3">
                    <span className="" style={{ fontSize: "16px", color: "" }}>
                      Phí vận chuyển
                    </span>
                    <span
                      className="text-dark"
                      style={{ fontSize: "17px", fontWeight: "500" }}
                    >
                      {order &&
                        order.phiShip &&
                        order.phiShip.toLocaleString("vi-VN", {
                          style: "currency",
                          currency: "VND",
                        })}
                    </span>
                  </div>
                  <div className="d-flex justify-content-between mt-3">
                    <span
                      className="text-dark"
                      style={{ fontSize: "16px", color: "" }}
                    >
                      Khách cần trả
                    </span>
                    <span
                      className="text-dark"
                      style={{ fontSize: "17px", fontWeight: "500" }}
                    >
                      {order &&
                        order.khachCanTra &&
                        order.khachCanTra.toLocaleString("vi-VN", {
                          style: "currency",
                          currency: "VND",
                        }) || 0}
                    </span>
                  </div>
                  <div className="d-flex justify-content-between mt-3">
                    <span className="" style={{ fontSize: "16px", color: "" }}>
                      Khách đã trả
                    </span>
                    <span
                      className="text-dark"
                      style={{ fontSize: "17px", fontWeight: "500" }}
                    >
                      {(order &&
                        order.tienKhachTra &&
                        order.tienKhachTra.toLocaleString("vi-VN", {
                          style: "currency",
                          currency: "VND",
                        })) ||
                        0}
                    </span>
                  </div>
                </>
              )}
              {order.tienThua !== 0 ? (
                <div className="d-flex justify-content-between mt-3">
                  <span className="" style={{ fontSize: "16px", color: "" }}>
                    Tiền thừa trả khách
                  </span>
                  <span
                    className="text-dark"
                    style={{ fontSize: "17px", fontWeight: "500" }}
                  >
                    {order &&
                      order.tienThua &&
                      order.tienThua.toLocaleString("vi-VN", {
                        style: "currency",
                        currency: "VND",
                      })}
                  </span>
                </div>
              ) : (
                ""
              )}
              {order.tienTraHang && (
                <div className="d-flex justify-content-between mt-3">
                  <span className="" style={{ fontSize: "16px", color: "" }}>
                    Tổng tiền trả hàng
                  </span>
                  <span
                    className="text-dark"
                    style={{ fontSize: "17px", fontWeight: "500" }}
                  >
                    {order &&
                      order.tienTraHang.toLocaleString("vi-VN", {
                        style: "currency",
                        currency: "VND",
                      })}
                  </span>
                </div>
              )}
              {order.tienTraKhach && (
                <div className="d-flex justify-content-between mt-3">
                  <span className="" style={{ fontSize: "16px", color: "" }}>
                    Đã trả khách
                  </span>
                  <span
                    className="text-dark"
                    style={{ fontSize: "17px", fontWeight: "500" }}
                  >
                    {order &&
                      order.tienTraKhach.toLocaleString("vi-VN", {
                        style: "currency",
                        currency: "VND",
                      })}
                  </span>
                </div>
              )}
              {order.tienTraKhach &&
                <div className="d-flex justify-content-between mt-3">
                  <span className="" style={{ fontSize: "16px", color: "" }}>
                    Tổng tiền sau hoàn trả
                    <Tooltip className="ms-2"
                      TransitionComponent={Zoom}
                      title="Tổng tiền sau hoàn trả (là tổng tiền của đơn hàng sau khi hoàn trả) = Tiền khách trả - tiền đã trả khách"
                      style={{ cursor: "pointer" }}
                    >
                      <HelpOutlineIcon />
                    </Tooltip>
                  </span>
                  <span
                    className="text-dark"
                    style={{ fontSize: "17px", fontWeight: "500" }}
                  >
                    {(totalDiscount(order.tienKhachTra, order.tienTraKhach).toLocaleString("vi-VN", {
                      style: "currency",
                      currency: "VND",
                    })) ||
                      0}
                  </span>
                </div>
              }
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="wrap-container">
        <div className="wrap-timeline mt-4">
          <div class="scroll-container mt-2">
            <Card>
              <Card.Body>
                <TimeLine />
              </Card.Body>
            </Card>
          </div>
          <ConfirmDialog
            open={openCommon}
            status={status}
            confirmOrderInfo={handleConfirmOrderInfo}
            confirmDelivery={handleConfirmDelivery}
            confirmFinish={handleConfirmOrderFinish}
            confirmCancel={handleConfirmOrderCancel}
            onCloseNoAction={handleCloseNoActionCommon}
          />
          <ProcessOrder />
        </div>

        <OrderInfo />
        <PaymentHistories />
        <OrderSummary />

        <OrderHistoryDialog
          columns={columnsTableOrderHistories}
          open={openDialogDetailOrderHistories}
          onClose={handleCloseDialogDetailOrderHistories}
          dataSource={orderHistories}
        />
        <PaymentDialog
          open={openDialogPayment}
          onClose={handleCloseDialogPayment}
          onCloseNoAction={handleCloseNoActionDialogPayment}
          addPayment={handleAddPayment}
        />
        <UpdateRecipientOrderDialog
          open={openDialogUpdateRecipientOrder}
          onClose={handleCloseDialogUpdateRecipientOrder}
          onCloseNoAction={handleCloseNoActionDialogUpdateRecipientOrder}
          name={customerName}
          phone={customerPhone}
          address={customerAddress}
          province={customerProvince}
          district={customerDistrict}
          ward={customerWard}
          note={customerNote}
          update={updateInfoOrderDelivery}
        />

        <MultiplePaymentMethodsDelivery
          open={openPayment}
          close={handleCloseOpenPayment}
          hoanTien={isRefund}
          data={paymentHistorys}
          khachCanTra={order.khachCanTra}
          khachThanhToan={order.tienKhachTra}
          canTraKhach={order.tienTraHang}
          addPayment={handlePaymentOrder}
        />

        <ProductsDialog
          onOpenImei={handleOpenModalImei}
          onCloseImei={handleCloseOpenModalImei}
          openImei={openModalImei}
          isOpen={isOpen}
          open={openProducts}
          onClose={handleCloseOpenProducts}
          data={products}
          add={handleAddProductToCartOrder}
        />

        <ModalUpdateImeiByProductItem
          open={openModalUpdateImei}
          close={handleCloseOpenModalUpdateImei}
          imeis={imeis}
          imeisChuaBan={selectedImei}
          refresh={selectedImeiRefresh}
          update={handleUpdateAmountCartItemOrder}
          delivery={true}
          max={maxAmount}
          openOrder={openOrder}
          closeOrder={handleCloseOpenOrder}
          onOpenOrder={handleOpenOrder}
          size={size}
        />

        <ModalViewImeiHadBuy
          open={openViewImei}
          close={handleCloseOpenViewImei}
          imeis={viewImeis}
        />

        <ScannerBarcode
          open={openScanner}
          close={handleCloseOpenScanner}
          getResult={addProductToOrderByScanner}
          refresh={scannerRef}
        />

        <ConfirmRollBack
          open={openRollback}
          confirm={rollBackStatus}
          close={handleCloseOpenRollback}
        />
        <PrintBillAtTheCounter data={order} ref={componentRef} />
        <PrintBillDelivery ref={componentRef1} data={order} />

        {isLoading && <LoadingIndicator />}
        <div className="mt-4"></div>
      </div>
    </>
  );
};
export default OrderDetail;
