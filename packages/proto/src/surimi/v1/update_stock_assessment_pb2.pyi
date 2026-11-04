from surimi.v1 import stock_assessment_pb2 as _stock_assessment_pb2
from google.protobuf import descriptor as _descriptor
from google.protobuf import message as _message
from collections.abc import Mapping as _Mapping
from typing import ClassVar as _ClassVar, Optional as _Optional, Union as _Union

DESCRIPTOR: _descriptor.FileDescriptor

class UpdateStockAssessmentRequest(_message.Message):
    __slots__ = ("experiment_id", "stock_assessment_summary")
    EXPERIMENT_ID_FIELD_NUMBER: _ClassVar[int]
    STOCK_ASSESSMENT_SUMMARY_FIELD_NUMBER: _ClassVar[int]
    experiment_id: str
    stock_assessment_summary: _stock_assessment_pb2.StockAssessmentSummary
    def __init__(self, experiment_id: _Optional[str] = ..., stock_assessment_summary: _Optional[_Union[_stock_assessment_pb2.StockAssessmentSummary, _Mapping]] = ...) -> None: ...

class UpdateStockAssessmentResponse(_message.Message):
    __slots__ = ("experiment_id",)
    EXPERIMENT_ID_FIELD_NUMBER: _ClassVar[int]
    experiment_id: str
    def __init__(self, experiment_id: _Optional[str] = ...) -> None: ...
