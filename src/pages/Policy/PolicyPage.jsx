const POLICY_CONTENT = {
  payment: {
    intro: "Hỗ trợ nhiều hình thức thanh toán linh hoạt cho đơn hàng online và tại cửa hàng.",
    items: [
      "Thanh toán tiền mặt khi nhận hàng.",
      "Chuyển khoản ngân hàng theo thông tin đơn hàng.",
      "Thanh toán thẻ hoặc ví điện tử khi hệ thống được kích hoạt.",
    ],
    title: "Phương thức thanh toán",
  },
  return: {
    intro: "Quy trình đổi trả minh bạch giúp khách hàng yên tâm khi mua sắm.",
    items: [
      "Sản phẩm còn đầy đủ hộp, phụ kiện và hóa đơn mua hàng.",
      "Tiếp nhận đổi trả theo tình trạng sản phẩm và quy định cửa hàng.",
      "Hỗ trợ kiểm tra lỗi kỹ thuật trước khi xử lý đổi trả.",
    ],
    title: "Chính sách đổi trả",
  },
  shipping: {
    intro: "BStore giao hàng toàn quốc và ưu tiên đóng gói an toàn cho thiết bị điện tử.",
    items: [
      "Xác nhận đơn hàng trước khi giao.",
      "Hỗ trợ giao nhanh trong khu vực nội thành khi có sẵn hàng.",
      "Khách hàng được kiểm tra ngoại quan khi nhận hàng.",
    ],
    title: "Chính sách giao hàng",
  },
  terms: {
    intro: "Các điều khoản sử dụng bảo vệ trải nghiệm mua sắm và thông tin của khách hàng.",
    items: [
      "Thông tin sản phẩm và giá có thể được cập nhật theo từng thời điểm.",
      "Khách hàng cần cung cấp thông tin chính xác khi đặt hàng.",
      "BStore có quyền từ chối đơn hàng có dấu hiệu gian lận hoặc sai lệch.",
    ],
    title: "Điều khoản sử dụng",
  },
  warranty: {
    intro: "Sản phẩm chính hãng được tiếp nhận bảo hành theo điều kiện của nhà sản xuất.",
    items: [
      "Hỗ trợ kiểm tra tình trạng sản phẩm tại cửa hàng.",
      "Bảo hành áp dụng cho lỗi kỹ thuật phát sinh từ nhà sản xuất.",
      "Thời gian xử lý phụ thuộc vào hãng sản xuất và linh kiện thay thế.",
    ],
    title: "Chính sách bảo hành",
  },
};

export default function PolicyPage({ type }) {
  const policy = POLICY_CONTENT[type] || POLICY_CONTENT.warranty;

  return (
    <main className="container content-page policy-page">
      <section className="content-hero">
        <span>Chính sách BStore</span>
        <h1>{policy.title}</h1>
        <p>{policy.intro}</p>
      </section>

      <section className="policy-list">
        {policy.items.map((item, index) => (
          <article key={item}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <p>{item}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
