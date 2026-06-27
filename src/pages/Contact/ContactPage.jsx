import { useState } from "react";

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (event) => {
    event.preventDefault();
    setSubmitted(true);
  };

  return (
    <main className="container content-page contact-page">
      <section className="content-hero">
        <span>Liên hệ</span>
        <h1>BStore sẵn sàng hỗ trợ đơn hàng và tư vấn sản phẩm</h1>
        <p>
          Gửi thông tin cho chúng tôi hoặc liên hệ trực tiếp qua hotline để được
          hỗ trợ nhanh.
        </p>
      </section>

      <section className="contact-layout">
        <div className="contact-info">
          <article>
            <span>Địa chỉ</span>
            <strong>180 Cao Lỗ, Phường 4, Quận 8, TP. Hồ Chí Minh</strong>
          </article>
          <article>
            <span>Hotline</span>
            <strong>1900 6868</strong>
          </article>
          <article>
            <span>Email</span>
            <strong>support@bstore.vn</strong>
          </article>
        </div>

        <form className="contact-form" onSubmit={handleSubmit}>
          <label>
            Họ và tên
            <input name="name" placeholder="Nguyen Van A" required />
          </label>
          <label>
            Email
            <input name="email" placeholder="email@example.com" required type="email" />
          </label>
          <label>
            Số điện thoại
            <input name="phone" placeholder="090..." />
          </label>
          <label>
            Nội dung
            <textarea name="message" placeholder="BStore có thể hỗ trợ gì cho bạn?" rows="5" />
          </label>
          <button type="submit">Gửi liên hệ</button>
          {submitted ? <p>Cảm ơn bạn, BStore sẽ phản hồi sớm.</p> : null}
        </form>
      </section>

      <section className="map-panel" aria-label="Google Map">
        <iframe
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          src="https://www.google.com/maps?q=180%20Cao%20Lo%2C%20Quan%208%2C%20TP.HCM&output=embed"
          title="Bản đồ BStore"
        />
      </section>
    </main>
  );
}
