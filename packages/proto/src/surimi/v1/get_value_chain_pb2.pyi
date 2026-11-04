from surimi.v1 import value_chain_pb2 as _value_chain_pb2
from google.protobuf import descriptor as _descriptor
from google.protobuf import message as _message
from collections.abc import Mapping as _Mapping
from typing import ClassVar as _ClassVar, Optional as _Optional, Union as _Union

DESCRIPTOR: _descriptor.FileDescriptor

class GetValueChainRequest(_message.Message):
    __slots__ = ("experiment_id",)
    EXPERIMENT_ID_FIELD_NUMBER: _ClassVar[int]
    experiment_id: str
    def __init__(self, experiment_id: _Optional[str] = ...) -> None: ...

class GetValueChainResponse(_message.Message):
    __slots__ = ("experiment_id", "value_chain_summary")
    EXPERIMENT_ID_FIELD_NUMBER: _ClassVar[int]
    VALUE_CHAIN_SUMMARY_FIELD_NUMBER: _ClassVar[int]
    experiment_id: str
    value_chain_summary: _value_chain_pb2.ValueChainSummary
    def __init__(self, experiment_id: _Optional[str] = ..., value_chain_summary: _Optional[_Union[_value_chain_pb2.ValueChainSummary, _Mapping]] = ...) -> None: ...
