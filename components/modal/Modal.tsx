import React from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: { keyword: string; rank: number; date: string }[];
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, data }) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1000,
      }}
    >
      <div
        style={{
          backgroundColor: "#fff",
          borderRadius: "10px",
          padding: "20px",
          width: "80%",
          maxHeight: "90%",
          overflowY: "auto",
        }}
      >
        <h2 style={{ marginBottom: "20px", textAlign: "center" }}>데이터 상세보기</h2>

        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead style={{ backgroundColor: "#f8f9fa" }}>
            <tr>
              <th style={{ border: "1px solid #ddd", padding: "10px", textAlign: "center", color:"black"}}>
                키워드
              </th>
              <th style={{ border: "1px solid #ddd", padding: "10px", textAlign: "center", color:"black" }}>
                랭크
              </th>
              <th style={{ border: "1px solid #ddd", padding: "10px", textAlign: "center", color:"black" }}>
                날짜
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, index) => (
              <tr key={index}>
                <td style={{ border: "1px solid #ddd", padding: "10px", color:"black", textAlign: "center" }}>
                  {item.keyword}
                </td>
                <td
                  style={{
                    border: "1px solid #ddd",
                    padding: "10px",
                    textAlign: "center",
                    color:"black",
                  }}
                >
                  {item.rank}
                </td>
                <td
                  style={{
                    border: "1px solid #ddd",
                    padding: "10px",
                    textAlign: "center",
                    color:"black",
                  }}
                >
                  {item.date}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ textAlign: "center", marginTop: "20px" }}>
          <button
            onClick={onClose}
            style={{
              padding: "10px 20px",
              backgroundColor: "#007bff",
              color: "#fff",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer",
            }}
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};

export default Modal;
