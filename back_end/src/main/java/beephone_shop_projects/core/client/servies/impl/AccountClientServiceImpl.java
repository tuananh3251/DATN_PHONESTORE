package beephone_shop_projects.core.client.servies.impl;

import beephone_shop_projects.core.admin.account_management.repository.AccountRepository;
import beephone_shop_projects.core.admin.account_management.repository.RoleRepository;
import beephone_shop_projects.core.client.models.request.AccountChangeInformationRequest;
import beephone_shop_projects.core.client.models.request.AccountLoginRequest;
import beephone_shop_projects.core.client.models.request.AccountRegisterRequest;
import beephone_shop_projects.core.client.models.response.AccountDto;
import beephone_shop_projects.core.client.repositories.AccountClientRepository;
import beephone_shop_projects.core.client.repositories.CartClientRepository;
import beephone_shop_projects.core.client.repositories.CartDetailClientRepository;
import beephone_shop_projects.entity.Account;
import beephone_shop_projects.entity.GioHang;
import beephone_shop_projects.entity.Role;
import beephone_shop_projects.infrastructure.config.mail.EmailService;
import beephone_shop_projects.infrastructure.constant.StatusAccountCus;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.thymeleaf.context.Context;

import java.nio.CharBuffer;
import java.util.Random;

@RequiredArgsConstructor
@Service
public class AccountClientServiceImpl{

    @Autowired
    private AccountClientRepository accountClientRepository;

    @Autowired
    private CartDetailClientRepository cartDetailClientRepository;

    @Autowired
    private CartClientRepository cartClientRepository;

    @Autowired
    private AccountRepository accountRepository;

    @Autowired
    private RoleRepository roleRepository;

    private final PasswordEncoder passwordEncoder;

    @Autowired
    private EmailService emailService;

    public AccountDto checkEmailAndPass(AccountLoginRequest accountLoginRequest) {
        Account kh = accountClientRepository.checkEmailAndPass(accountLoginRequest.getEmail());
        if (passwordEncoder.matches(CharBuffer.wrap(accountLoginRequest.getPassword()), kh.getMatKhau())) {
            AccountDto dto = new AccountDto().builder()
                    .id(kh.getId())
                    .anhDaiDien(kh.getAnhDaiDien())
                    .email(kh.getEmail())
                    .hoVaTen(kh.getHoVaTen())
                    .ma(kh.getMa())
                    .anhDaiDien(kh.getAnhDaiDien())
                    .soDienThoai(kh.getSoDienThoai())
                    .idRole(kh.getIdRole().getMa())
                    .tenChucVu(kh.getIdRole().getTen())
                    .gioiTinh(kh.getGioiTinh())
                    .build();
            return dto;
        }else{
            throw new RuntimeException(("Bạn không nhập đúng tài khoản hoặc mật khẩu"));
        }
    }

    public Account getAccountByIDAccount(String idAccount){
        return accountClientRepository.findById(idAccount).isPresent()?accountClientRepository.findById(idAccount).get():null;
    }

    public Account createAccountAnonymous(){
        Account account = accountClientRepository.findByMa();
        if(account == null){
            accountClientRepository.save(new Account());
            account = accountClientRepository.findByMa();
        }
        else{
            GioHang gioHang = cartClientRepository.getGioHangByIDKhachHang(account.getId());
            if(gioHang != null){
                cartDetailClientRepository.deleteGioHangChiTietByIdGioHang(gioHang.getId());
            }
        }
        return account;
    }

    public Account login(AccountLoginRequest accountLoginRequest) {
        Account account = accountClientRepository.checkEmailAndPass(accountLoginRequest.getEmail());
        if(account != null){
            return account;
        }else{
            throw new RuntimeException("Email hoặc mật khẩu không đúng");
        }
    }

    public Account findByEmail(String email){
        return accountClientRepository.findByEmail(email);
    }

    public AccountDto register(AccountRegisterRequest request) {
        // Kiểm tra trùng email và số điện thoại
        Account account = accountClientRepository.findByEmail(request.getEmail());
        Account account2 = accountClientRepository.findByPhoneNumber(request.getPhone());

        if (account != null) {
            throw new RuntimeException("Email đã tồn tại trong hệ thống");
        }
        if (account2 != null) {
            throw new RuntimeException("Số điện thoại đã tồn tại trong hệ thống");
        }

        // Tạo mã khách hàng ngẫu nhiên
        Random random = new Random();
        int number = random.nextInt(10000);
        String code = String.format("KH%04d", number);

        // Lấy role mặc định
        Role role = roleRepository.findByMa("role2");
        if (role == null) {
            throw new RuntimeException("Không tìm thấy vai trò mặc định.");
        }

        // Tạo tài khoản mới
        Account kh = Account.builder()
                .email(request.getEmail())
                .idRole(role)
                .hoVaTen(request.getName())
                .ma(code)
                .matKhau(passwordEncoder.encode(request.getPassword()))
                .soDienThoai(request.getPhone())
                .trangThai(StatusAccountCus.HOAT_DONG) // ánh xạ giá trị 0 trong DB
                .build();

        // Lưu vào database
        kh = accountRepository.save(kh);
        if (kh == null) {
            throw new RuntimeException("Đăng ký tài khoản thất bại.");
        }

        // Tạo DTO trả về
        AccountDto dto = AccountDto.builder()
                .anhDaiDien(kh.getAnhDaiDien())
                .email(kh.getEmail())
                .hoVaTen(kh.getHoVaTen())
                .ma(kh.getMa())
                .soDienThoai(kh.getSoDienThoai())
                .idRole(kh.getIdRole().getMa())
                .id(kh.getId())
                .build();

        // Gửi email chứa mật khẩu ban đầu
        Context context = new Context();
        context.setVariable("password", request.getPassword());
        emailService.sendEmailWithHtmlTemplate(
                request.getEmail(),
                "Chúc mừng bạn đã đăng ký thành công.",
                "email-get-pass-template",
                context
        );

        return dto;
    }


    public Account changeInformationUser(AccountChangeInformationRequest req){
        Account account = accountRepository.findById(req.getId()).orElseThrow(() -> new IllegalArgumentException("Không tìm thấy tài khoản"));

        account.setHoVaTen(req.getName());
        account.setGioiTinh(req.getGender());
        account.setEmail(req.getEmail());
        account.setSoDienThoai(req.getPhoneNumber());

        return accountRepository.save(account);
    }

    public String changePass(String newPass, String idAccount){
        Account account = accountRepository.findById(idAccount).orElseThrow(() -> new IllegalArgumentException("Không tìm thấy tài khoản"));

        // change pass
        account.setMatKhau(passwordEncoder.encode(newPass));
        accountRepository.save(account);

        Context context = new Context();
        //send new pass
        context.setVariable("password", newPass);

        emailService.sendEmailWithHtmlTemplate(account.getEmail(), "Chúc mừng bạn đã đổi mật khẩu thành công.", "email-get-pass-template", context);
        return "Đổi mật khẩu thành công";
    }
}
