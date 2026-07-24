import { useState } from "react";
import { Link } from "react-router-dom";
import Pagination from "../../components/Pagination";
import StatusMessage from "../../components/StatusMessage";
import WarrantyStatusBadge from "../../components/warranty/WarrantyStatusBadge";
import { useCustomerWarranties } from "../../hooks/useWarrantyRequests";
import { getStatusErrorMessage } from "../../utils/apiErrors";
import { formatWarrantyDate, WARRANTY_STATUSES } from "../../utils/warranty";

export default function WarrantyRequestsPage() {
  const [filters, setFilters] = useState({ search: "", status: "", page: 1, per_page: 10 });
  const query = useCustomerWarranties(filters);
  const data = query.data || { items: [], pagination: { page: 1, lastPage: 1, total: 0 } };
  return <main className="container warranty-page">
    <section className="page-heading"><div><span>Tài khoản</span><h1>Yêu cầu bảo hành</h1>
      <p>Theo dõi toàn bộ yêu cầu bảo hành của bạn.</p></div></section>
    <section className="account-panel">
      <div className="warranty-filters">
        <label><span>Tìm kiếm</span><input placeholder="Mã yêu cầu hoặc mã đơn hàng" value={filters.search}
          onChange={(e) => setFilters((x) => ({ ...x, search: e.target.value, page: 1 }))} /></label>
        <label><span>Trạng thái</span><select value={filters.status}
          onChange={(e) => setFilters((x) => ({ ...x, status: e.target.value, page: 1 }))}>
          <option value="">Tất cả</option>{Object.entries(WARRANTY_STATUSES).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
        </select></label>
      </div>
      {query.error ? <StatusMessage tone="error">{getStatusErrorMessage(query.error, "Không thể tải yêu cầu bảo hành.")}
        <button onClick={() => query.refetch()} type="button">Thử lại</button></StatusMessage> : null}
      {query.isLoading ? <div className="warranty-skeleton">{Array.from({length:4}).map((_,i)=><span className="skeleton-line" key={i}/>)}</div> : null}
      {!query.isLoading && !query.error && !data.items.length ? <div className="empty-state"><h2>Chưa có yêu cầu bảo hành</h2>
        <p>Yêu cầu hợp lệ được gửi từ chi tiết đơn hàng đã giao.</p><Link className="primary-button" to="/account#orders">Xem đơn hàng</Link></div> : null}
      {data.items.length ? <div className="admin-table-wrap"><table className="admin-table warranty-table"><thead><tr>
        <th>Mã yêu cầu</th><th>Đơn hàng</th><th>Sản phẩm</th><th>Lý do</th><th>Trạng thái</th><th>Ngày gửi</th><th>Hạn bảo hành</th><th />
      </tr></thead><tbody>{data.items.map((item)=><tr key={item.id}><td>#{item.code}</td><td>#{item.orderCode}</td>
        <td><div className="warranty-product-cell">{item.productImage?<img alt="" src={item.productImage}/>:null}<strong>{item.productName}</strong></div></td>
        <td>{item.reason}</td><td><WarrantyStatusBadge status={item.status}/></td><td>{formatWarrantyDate(item.submittedAt)}</td>
        <td>{formatWarrantyDate(item.expiryDate)}</td><td><Link to={`/account/warranty-requests/${item.id}`}>Xem chi tiết</Link></td></tr>)}</tbody></table></div>:null}
      <Pagination disabled={query.isFetching} page={data.pagination.page} totalPages={data.pagination.lastPage}
        onChange={(page)=>setFilters((x)=>({...x,page}))}/>
    </section>
  </main>;
}
