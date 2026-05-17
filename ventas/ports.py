from abc import ABC, abstractmethod
from typing import Any, Dict, Optional


class FacturacionPort(ABC):
    @abstractmethod
    def validar_conexion(self) -> Dict[str, Any]:
        raise NotImplementedError

    @abstractmethod
    def ver_empresa(self) -> Dict[str, Any]:
        raise NotImplementedError

    @abstractmethod
    def listar_rangos(self) -> Dict[str, Any]:
        raise NotImplementedError

    @abstractmethod
    def consultar_adquiriente(
        self,
        identification_document_id: str,
        identification_number: str,
    ) -> Dict[str, Any]:
        raise NotImplementedError

    @abstractmethod
    def emitir_factura(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        raise NotImplementedError

    @abstractmethod
    def consultar_factura(self, bill_number: str) -> Dict[str, Any]:
        raise NotImplementedError

    @abstractmethod
    def descargar_pdf(self, bill_number: str) -> Dict[str, Any]:
        raise NotImplementedError

    @abstractmethod
    def descargar_xml(self, bill_number: str) -> Dict[str, Any]:
        raise NotImplementedError

    @abstractmethod
    def enviar_email(self, bill_number: str, email: str) -> Dict[str, Any]:
        raise NotImplementedError

    @abstractmethod
    def crear_nota_credito(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        raise NotImplementedError

    @abstractmethod
    def consultar_nota_credito(self, note_number: str) -> Dict[str, Any]:
        raise NotImplementedError

    @abstractmethod
    def listar_notas_credito(
        self,
        *,
        reference_code: Optional[str] = None,
        number: Optional[str] = None,
        status: Optional[str] = None,
    ) -> Dict[str, Any]:
        raise NotImplementedError

