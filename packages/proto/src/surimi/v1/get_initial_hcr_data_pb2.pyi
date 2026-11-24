from buf.validate import validate_pb2 as _validate_pb2
from surimi.v1 import initial_hcr_data_pb2 as _initial_hcr_data_pb2
from google.protobuf import descriptor as _descriptor
from google.protobuf import message as _message
from collections.abc import Mapping as _Mapping
from typing import ClassVar as _ClassVar, Optional as _Optional, Union as _Union

DESCRIPTOR: _descriptor.FileDescriptor

class GetInitialHCRDataRequest(_message.Message):
    __slots__ = ("scenario_name",)
    SCENARIO_NAME_FIELD_NUMBER: _ClassVar[int]
    scenario_name: str
    def __init__(self, scenario_name: _Optional[str] = ...) -> None: ...

class GetInitialHCRDataResponse(_message.Message):
    __slots__ = ("initial_hcr_data_summary",)
    INITIAL_HCR_DATA_SUMMARY_FIELD_NUMBER: _ClassVar[int]
    initial_hcr_data_summary: _initial_hcr_data_pb2.InitialHCRDataSummary
    def __init__(self, initial_hcr_data_summary: _Optional[_Union[_initial_hcr_data_pb2.InitialHCRDataSummary, _Mapping]] = ...) -> None: ...
